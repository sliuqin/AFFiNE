import type { ExecutionContext, TestFn } from 'ava';
import ava from 'ava';
import Sinon from 'sinon';
import type { Response } from 'supertest';

import { createTestingApp, TestingApp } from './utils';

type TestContext = {
  app: TestingApp;
};

const test = ava as TestFn<TestContext>;

test.before(async t => {
  // @ts-expect-error test
  env.DEPLOYMENT_TYPE = 'selfhosted';
  const app = await createTestingApp();

  t.context.app = app;
});

test.after.always(async t => {
  await t.context.app.close();
});

const assertAndSnapshotRaw = async (
  t: ExecutionContext<TestContext>,
  route: string,
  message: string,
  options?: {
    status?: number;
    origin?: string;
    method?: 'GET' | 'OPTIONS' | 'POST';
    body?: any;
    checker?: (res: Response) => any;
  }
) => {
  const {
    status = 200,
    origin = 'http://localhost',
    method = 'GET',
    checker = () => {},
  } = options || {};
  const { app } = t.context;
  const res = app[method](route)
    .set('Origin', origin)
    .send(options?.body)
    .expect(status)
    .expect(checker);
  await t.notThrowsAsync(res, message);
  t.snapshot((await res).body);
};

test('should proxy image', async t => {
  const assertAndSnapshot = assertAndSnapshotRaw.bind(null, t);

  await assertAndSnapshot(
    '/api/worker/image-proxy',
    'should return proper CORS headers on OPTIONS request',
    {
      status: 204,
      method: 'OPTIONS',
      checker: (res: Response) => {
        if (!res.headers['access-control-allow-methods']) {
          throw new Error('Missing CORS headers');
        }
      },
    }
  );

  {
    await assertAndSnapshot(
      '/api/worker/image-proxy',
      'should return 400 if "url" query parameter is missing',
      { status: 400 }
    );
  }

  {
    await assertAndSnapshot(
      '/api/worker/image-proxy?url=http://example.com/image.png',
      'should return 400 for invalid origin header',
      { status: 400, origin: 'http://invalid.com' }
    );
  }

  {
    const fakeBuffer = Buffer.from('fake image');
    const fakeResponse = {
      ok: true,
      headers: {
        get: (header: string) => {
          if (header.toLowerCase() === 'content-type') return 'image/png';
          if (header.toLowerCase() === 'content-disposition') return 'inline';
          return null;
        },
      },
      arrayBuffer: async () => fakeBuffer,
    } as any;

    const fetchSpy = Sinon.stub(global, 'fetch').resolves(fakeResponse);

    await assertAndSnapshot(
      '/api/worker/image-proxy?url=http://example.com/image.png',
      'should return image buffer'
    );

    fetchSpy.restore();
  }
});

test('should preview link', async t => {
  const assertAndSnapshot = assertAndSnapshotRaw.bind(null, t);

  await assertAndSnapshot(
    '/api/worker/link-preview',
    'should return proper CORS headers on OPTIONS request',
    {
      status: 204,
      method: 'OPTIONS',
      checker: (res: Response) => {
        if (!res.headers['access-control-allow-methods']) {
          throw new Error('Missing CORS headers');
        }
      },
    }
  );

  await assertAndSnapshot(
    '/api/worker/link-preview',
    'should return 400 if request body is invalid',
    { status: 400, method: 'POST' }
  );

  await assertAndSnapshot(
    '/api/worker/link-preview',
    'should return 400 if provided URL is from the same origin',
    { status: 400, method: 'POST', body: { url: 'http://localhost/somepage' } }
  );

  {
    const fakeHTML = new Response(`
        <html>
          <head>
            <meta property="og:title" content="Test Title" />
            <meta property="og:description" content="Test Description" />
            <meta property="og:image" content="http://example.com/image.png" />
          </head>
          <body>
            <title>Fallback Title</title>
          </body>
        </html>
      `);

    Object.defineProperty(fakeHTML, 'url', {
      value: 'http://example.com/page',
    });

    const fetchSpy = Sinon.stub(global, 'fetch').resolves(fakeHTML);

    await assertAndSnapshot(
      '/api/worker/link-preview',
      'should process a valid external URL and return link preview data',
      {
        status: 200,
        method: 'POST',
        body: { url: 'http://external.com/page' },
      }
    );

    fetchSpy.restore();
  }

  {
    const encoded = [
      {
        content: 'xOO6w6OsysC956Gj',
        charset: 'gb2312',
      },
      {
        content: 'grGC8YLJgr+CzYFBkKKKRYFC',
        charset: 'shift-jis',
      },
      {
        content: 'p0GmbqFBpUCsyaFD',
        charset: 'big5',
      },
      {
        content: 'vsiz58fPvLy/5CwgvLyw6C4=',
        charset: 'euc-kr',
      },
    ];

    for (const { content, charset } of encoded) {
      const before = Buffer.from(`<html>
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=${charset}" />
            <meta property="og:title" content="`);
      const encoded = Buffer.from(content, 'base64');
      const after = Buffer.from(`" />
          </head>
        </html>
      `);
      const fakeHTML = new Response(Buffer.concat([before, encoded, after]));

      Object.defineProperty(fakeHTML, 'url', {
        value: `http://example.com/${charset}`,
      });

      const fetchSpy = Sinon.stub(global, 'fetch').resolves(fakeHTML);

      await assertAndSnapshot(
        '/api/worker/link-preview',
        'should decode HTML content with charset',
        {
          status: 200,
          method: 'POST',
          body: { url: `http://example.com/${charset}` },
        }
      );

      fetchSpy.restore();
    }
  }
});

test('should handle webcontainer operations', async t => {
  const assertAndSnapshot = assertAndSnapshotRaw.bind(null, t);

  await t.context.app
    .POST('/api/worker/web-container')
    .set('Origin', 'http://localhost')
    .set('Referer', 'http://localhost/test')
    .expect(400);

  await t.context.app
    .POST('/api/worker/web-container')
    .set('Origin', 'http://localhost')
    .set('Referer', 'http://localhost/test')
    .field('html', 'x'.repeat(1024 * 1024))
    .expect(413);

  {
    const testHtml =
      '<html><head><title>Test</title></head><body><h1>Hello WebContainer</h1></body></html>';

    const createResponse = await t.context.app
      .POST('/api/worker/web-container')
      .set('Origin', 'http://localhost')
      .set('Referer', 'http://localhost/test')
      .field('html', testHtml)
      .expect(200);

    t.truthy(createResponse.body.url);
    t.true(createResponse.body.url.includes('/api/worker/web-container/'));
    t.true(createResponse.body.url.includes('signature='));
    t.true(createResponse.body.url.includes('timestamp='));

    const url = new URL(createResponse.body.url);
    const getResponse = await t.context.app
      .GET(url.pathname + url.search)
      .set('Referer', 'http://localhost/test')
      .expect(200);

    t.is(getResponse.text, testHtml);
    t.is(getResponse.headers['content-type'], 'text/html; charset=utf-8');
    t.is(getResponse.headers['x-frame-options'], 'SAMEORIGIN');
    t.is(getResponse.headers['x-content-type-options'], 'nosniff');
  }

  await assertAndSnapshot(
    '/api/worker/web-container/somehash?signature=invalid&timestamp=123456789',
    'should return 400 for webContainer with invalid signature',
    { status: 400 }
  );

  await assertAndSnapshot(
    '/api/worker/web-container/somehash?signature=valid&timestamp=123456789',
    'should return 400 for webContainer with missing referer',
    { status: 400, origin: 'http://localhost' }
  );

  {
    const expiredTimestamp = Date.now() - 7 * 60 * 60 * 1000; // 7 hours ago
    await assertAndSnapshot(
      `/api/worker/web-container/somehash?signature=valid&timestamp=${expiredTimestamp}`,
      'should return 400 for webContainer with expired timestamp',
      { status: 400 }
    );
  }
});
