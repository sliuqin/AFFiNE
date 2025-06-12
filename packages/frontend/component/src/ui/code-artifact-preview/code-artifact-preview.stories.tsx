import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';

import { CodeArtifactPreview } from './code-artifact-preview';

const meta: Meta<typeof CodeArtifactPreview> = {
  title: 'UI/CodeArtifactPreview',
  component: CodeArtifactPreview,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: { type: 'select' },
      options: ['light', 'dark'],
    },
    language: {
      control: { type: 'text' },
    },
    previewable: {
      control: { type: 'boolean' },
    },
    complete: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample HTML Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .button {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px 0;
        }
        .button:hover {
            background: #ff5252;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Hello, World!</h1>
        <p>This is a sample HTML page with some interactive elements.</p>
        <button class="button" onclick="alert('Button clicked!')">Click Me!</button>
        <br>
        <input type="text" placeholder="Type something..." style="padding: 8px; margin: 10px 0; border: none; border-radius: 4px;">
        <br>
        <select style="padding: 8px; margin: 10px 0; border: none; border-radius: 4px;">
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
        </select>
    </div>
</body>
</html>`;

export const HTMLPreviewable: Story = {
  args: {
    code: Array.from({ length: 10 }, () => htmlCode).join('\n'),
    language: 'html',
    previewable: true,
    complete: true,
    theme: 'light',
  },
};

function useStreamCode(code: string) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const interval = setInterval(() => {
      setIndex(prev => {
        const charsToAdd = Math.min(
          Math.floor(Math.random() * 4) + 2,
          code.length - prev
        );
        return prev + charsToAdd;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [code]);

  return code.slice(0, index);
}

// Streaming HTML Story Component
const StreamingHtmlStory = () => {
  const streamedCode = useStreamCode(htmlCode);
  const isComplete = streamedCode.length === htmlCode.length;
  return (
    <div style={{ width: '800px', height: '600px' }}>
      <CodeArtifactPreview
        code={streamedCode}
        language="html"
        previewable={true}
        complete={isComplete}
        theme="light"
      />
    </div>
  );
};

export const StreamingHTML: Story = {
  render: () => <StreamingHtmlStory />,
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates streaming HTML content character by character. The preview switch appears only when streaming is complete.',
      },
    },
  },
};
