use affine_common::doc_loader::Doc;
use napi::{
  anyhow::anyhow,
  bindgen_prelude::{AsyncTask, Buffer},
  Env, JsObject, Result, Task,
};
use regex::Regex;

pub struct Document {
  inner: Doc,
  re: Regex,
}

impl Document {
  fn name(&self) -> String {
    self.inner.name.clone()
  }

  fn clean_input(&self, input: &str) -> String {
    self
      .re
      .replace_all(input, "")
      .replace("\n", " ")
      .replace("  ", " ")
      .replace("\x00", "")
      .trim()
      .to_string()
  }

  fn chunks(&self, env: Env) -> Result<JsObject> {
    let mut array = env.create_array_with_length(self.inner.chunks.len())?;
    for (i, chunk) in self.inner.chunks.iter().enumerate() {
      let content = self.clean_input(&chunk.content);

      let mut obj = env.create_object()?;
      obj.set_named_property("index", i as i64)?;
      obj.set_named_property("content", content)?;
      array.set_element(i as u32, obj)?;
    }
    Ok(array)
  }

  fn resolve(self, env: Env) -> Result<JsObject> {
    let mut obj = env.create_object()?;
    obj.set_named_property("name", self.name())?;
    obj.set_named_property("chunks", self.chunks(env)?)?;
    Ok(obj)
  }
}

pub struct AsyncParseDocResponse {
  file_path: String,
  doc: Vec<u8>,
}

#[napi]
impl Task for AsyncParseDocResponse {
  type Output = Document;
  type JsValue = JsObject;

  fn compute(&mut self) -> Result<Self::Output> {
    let doc = Doc::new(&self.file_path, &self.doc).map_err(|e| anyhow!(e))?;
    let re = Regex::new(r"(Figure|Table)\s+\d+\.").map_err(|e| anyhow!(e))?;
    Ok(Document { inner: doc, re })
  }

  fn resolve(&mut self, env: Env, doc: Document) -> Result<Self::JsValue> {
    doc.resolve(env)
  }
}

#[napi(
  ts_return_type = "Promise<{ name: string, chunks: Array<{index: number, content: string}> }>"
)]
pub fn parse_doc(file_path: String, doc: Buffer) -> AsyncTask<AsyncParseDocResponse> {
  AsyncTask::new(AsyncParseDocResponse {
    file_path,
    doc: doc.to_vec(),
  })
}
