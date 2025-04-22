use std::{
  collections::HashMap,
  ffi::c_void,
  ptr,
  sync::{
    atomic::{AtomicPtr, Ordering},
    Arc, LazyLock, RwLock,
  },
};

use block2::{Block, RcBlock};
use core_foundation::{
  base::TCFType,
  string::{CFString, CFStringRef},
};
use coreaudio::sys::{
  kAudioHardwarePropertyProcessObjectList, kAudioObjectPropertyElementMain,
  kAudioObjectPropertyScopeGlobal, kAudioObjectSystemObject, kAudioProcessPropertyBundleID,
  kAudioProcessPropertyIsRunning, kAudioProcessPropertyIsRunningInput, kAudioProcessPropertyPID,
  AudioObjectAddPropertyListenerBlock, AudioObjectID, AudioObjectPropertyAddress,
  AudioObjectRemovePropertyListenerBlock,
};
use libc;
use napi::{
  bindgen_prelude::{Buffer, Error, Float32Array, Result, Status},
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;
use objc2::{
  msg_send,
  runtime::{AnyClass, AnyObject},
  Encode, Encoding,
};
use objc2_foundation::NSString;
use screencapturekit::shareable_content::SCShareableContent;
use uuid::Uuid;

use crate::{
  error::CoreAudioError,
  pid::{audio_process_list, get_process_property},
  tap_audio::{AggregateDeviceManager, AudioCaptureSession},
};

#[repr(C)]
struct CGSize {
  width: f64,
  height: f64,
}

#[repr(C)]
struct CGPoint {
  x: f64,
  y: f64,
}

#[repr(C)]
struct CGRect {
  origin: CGPoint,
  size: CGSize,
}

unsafe impl Encode for CGSize {
  const ENCODING: Encoding = Encoding::Struct("CGSize", &[f64::ENCODING, f64::ENCODING]);
}

unsafe impl Encode for CGPoint {
  const ENCODING: Encoding = Encoding::Struct("CGPoint", &[f64::ENCODING, f64::ENCODING]);
}

unsafe impl Encode for CGRect {
  const ENCODING: Encoding = Encoding::Struct("CGRect", &[<CGPoint>::ENCODING, <CGSize>::ENCODING]);
}

static RUNNING_APPLICATIONS: LazyLock<
  RwLock<std::result::Result<Vec<AudioObjectID>, CoreAudioError>>,
> = LazyLock::new(|| RwLock::new(audio_process_list()));

type ApplicationStateChangedSubscriberMap =
  HashMap<AudioObjectID, HashMap<Uuid, Arc<ThreadsafeFunction<(), ()>>>>;

static APPLICATION_STATE_CHANGED_SUBSCRIBERS: LazyLock<
  RwLock<ApplicationStateChangedSubscriberMap>,
> = LazyLock::new(|| RwLock::new(HashMap::new()));

static APPLICATION_STATE_CHANGED_LISTENER_BLOCKS: LazyLock<
  RwLock<HashMap<AudioObjectID, AtomicPtr<c_void>>>,
> = LazyLock::new(|| RwLock::new(HashMap::new()));

static NSRUNNING_APPLICATION_CLASS: LazyLock<Option<&'static AnyClass>> =
  LazyLock::new(|| AnyClass::get(c"NSRunningApplication"));

#[napi]
pub struct Application {
  pub(crate) process_id: i32,
  pub(crate) name: String,
}

#[napi]
impl Application {
  #[napi(constructor)]
  pub fn new(process_id: i32) -> Result<Self> {
    // Default values for when we can't get information
    let mut app = Self {
      process_id,
      name: String::new(),
    };

    // Try to populate fields using NSRunningApplication
    if process_id > 0 {
      // Get NSRunningApplication class
      if let Some(running_app_class) = NSRUNNING_APPLICATION_CLASS.as_ref() {
        // Get running application with PID
        let running_app: *mut AnyObject = unsafe {
          msg_send![
            *running_app_class,
            runningApplicationWithProcessIdentifier: process_id
          ]
        };

        if !running_app.is_null() {
          // Get name
          unsafe {
            let name_ptr: *mut NSString = msg_send![running_app, localizedName];
            if !name_ptr.is_null() {
              let length: usize = msg_send![name_ptr, length];
              let utf8_ptr: *const u8 = msg_send![name_ptr, UTF8String];

              if !utf8_ptr.is_null() {
                let bytes = std::slice::from_raw_parts(utf8_ptr, length);
                if let Ok(s) = std::str::from_utf8(bytes) {
                  app.name = s.to_string();
                }
              }
            }
          }
        }
      }
    }

    Ok(app)
  }

  #[napi(getter)]
  pub fn process_id(&self) -> i32 {
    self.process_id
  }

  #[napi(getter)]
  pub fn process_group_id(&self) -> i32 {
    if self.process_id > 0 {
      let pgid = unsafe { libc::getpgid(self.process_id) };
      if pgid != -1 {
        return pgid;
      }
      // Fall back to process_id if getpgid fails
      return self.process_id;
    }
    -1
  }

  #[napi(getter)]
  pub fn bundle_identifier(&self) -> String {
    if self.process_id <= 0 {
      return String::new();
    }

    // Try to get bundle identifier using NSRunningApplication
    if let Some(running_app_class) = NSRUNNING_APPLICATION_CLASS.as_ref() {
      let running_app: *mut AnyObject = unsafe {
        msg_send![
          *running_app_class,
          runningApplicationWithProcessIdentifier: self.process_id
        ]
      };

      if !running_app.is_null() {
        unsafe {
          let bundle_id_ptr: *mut NSString = msg_send![running_app, bundleIdentifier];
          if !bundle_id_ptr.is_null() {
            let length: usize = msg_send![bundle_id_ptr, length];
            let utf8_ptr: *const u8 = msg_send![bundle_id_ptr, UTF8String];

            if !utf8_ptr.is_null() {
              let bytes = std::slice::from_raw_parts(utf8_ptr, length);
              if let Ok(s) = std::str::from_utf8(bytes) {
                return s.to_string();
              }
            }
          }
        }
      }
    }

    String::new()
  }

  #[napi(getter)]
  pub fn name(&self) -> &str {
    &self.name
  }

  #[napi(getter)]
  pub fn icon(&self) -> Result<Buffer> {
    // Use catch_unwind to prevent any panics
    let icon_result = std::panic::catch_unwind(|| {
      // Get NSRunningApplication class with error handling
      let running_app_class = match NSRUNNING_APPLICATION_CLASS.as_ref() {
        Some(class) => class,
        None => {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }
      };

      // Get running application with PID
      let running_app: *mut AnyObject = unsafe {
        msg_send![
          *running_app_class,
          runningApplicationWithProcessIdentifier: self.process_id
        ]
      };
      if running_app.is_null() {
        return Ok(Buffer::from(Vec::<u8>::new()));
      }

      unsafe {
        // Get original icon
        let icon: *mut AnyObject = msg_send![running_app, icon];
        if icon.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        // Create a new NSImage with 64x64 size
        let nsimage_class = match AnyClass::get(c"NSImage") {
          Some(class) => class,
          None => return Ok(Buffer::from(Vec::<u8>::new())),
        };

        let resized_image: *mut AnyObject = msg_send![nsimage_class, alloc];
        if resized_image.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        let resized_image: *mut AnyObject =
          msg_send![resized_image, initWithSize: CGSize { width: 64.0, height: 64.0 }];
        if resized_image.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        let _: () = msg_send![resized_image, lockFocus];

        // Define drawing rectangle for 64x64 image
        let draw_rect = CGRect {
          origin: CGPoint { x: 0.0, y: 0.0 },
          size: CGSize {
            width: 64.0,
            height: 64.0,
          },
        };

        let from_rect = CGRect {
          origin: CGPoint { x: 0.0, y: 0.0 },
          size: CGSize {
            width: 0.0,
            height: 0.0,
          },
        };

        // Draw the original icon into draw_rect (using NSCompositingOperationCopy = 2)
        let _: () = msg_send![icon, drawInRect: draw_rect, fromRect: from_rect, operation: 2u64, fraction: 1.0];
        let _: () = msg_send![resized_image, unlockFocus];

        // Get TIFF representation from the downsized image
        let tiff_data: *mut AnyObject = msg_send![resized_image, TIFFRepresentation];
        if tiff_data.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        // Create bitmap image rep from TIFF
        let bitmap_class = match AnyClass::get(c"NSBitmapImageRep") {
          Some(class) => class,
          None => return Ok(Buffer::from(Vec::<u8>::new())),
        };

        let bitmap: *mut AnyObject = msg_send![bitmap_class, imageRepWithData: tiff_data];
        if bitmap.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        // Create properties dictionary with compression factor
        let dict_class = match AnyClass::get(c"NSMutableDictionary") {
          Some(class) => class,
          None => return Ok(Buffer::from(Vec::<u8>::new())),
        };

        let properties: *mut AnyObject = msg_send![dict_class, dictionary];
        if properties.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        // Add compression properties
        let compression_key = NSString::from_str("NSImageCompressionFactor");
        let number_class = match AnyClass::get(c"NSNumber") {
          Some(class) => class,
          None => return Ok(Buffer::from(Vec::<u8>::new())),
        };

        let compression_value: *mut AnyObject = msg_send![number_class, numberWithDouble: 0.8];
        if compression_value.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        let _: () = msg_send![properties, setObject: compression_value, forKey: &*compression_key];

        // Get PNG data with properties
        let png_data: *mut AnyObject =
          msg_send![bitmap, representationUsingType: 4u64, properties: properties]; // 4 = PNG

        if png_data.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        // Get bytes from NSData
        let bytes: *const libc::c_void = msg_send![png_data, bytes];
        let length: usize = msg_send![png_data, length];

        if bytes.is_null() {
          return Ok(Buffer::from(Vec::<u8>::new()));
        }

        // Copy bytes into a Vec<u8> instead of using the original memory
        let data = std::slice::from_raw_parts(bytes as *const u8, length).to_vec();
        Ok(Buffer::from(data))
      }
    });

    // Handle any panics that might have occurred
    match icon_result {
      Ok(result) => result,
      Err(_) => Ok(Buffer::from(Vec::<u8>::new())),
    }
  }
}

#[napi]
pub struct TappableApplication {
  pub(crate) app: Application,
  pub(crate) object_id: AudioObjectID,
}

#[napi]
impl TappableApplication {
  #[napi(constructor)]
  pub fn new(object_id: AudioObjectID) -> Result<Self> {
    // Get process ID from object_id
    let process_id = get_process_property(&object_id, kAudioProcessPropertyPID).unwrap_or(-1);

    // Create base Application
    let app = Application::new(process_id)?;

    Ok(Self { app, object_id })
  }

  #[napi(factory)]
  pub fn from_application(app: &Application, object_id: AudioObjectID) -> Self {
    Self {
      app: Application {
        process_id: app.process_id,
        name: app.name.clone(),
      },
      object_id,
    }
  }

  #[napi(getter)]
  pub fn process_id(&self) -> i32 {
    self.app.process_id
  }

  #[napi(getter)]
  pub fn process_group_id(&self) -> i32 {
    self.app.process_group_id()
  }

  #[napi(getter)]
  pub fn bundle_identifier(&self) -> String {
    // First try to get from the Application
    let app_bundle_id = self.app.bundle_identifier();
    if !app_bundle_id.is_empty() {
      return app_bundle_id;
    }

    // If not available, try to get from the audio process property
    match get_process_property::<CFStringRef>(&self.object_id, kAudioProcessPropertyBundleID) {
      Ok(bundle_id) => {
        // Safely convert CFStringRef to Rust String
        let cf_string = unsafe { CFString::wrap_under_create_rule(bundle_id) };
        cf_string.to_string()
      }
      Err(_) => {
        // Return empty string if we couldn't get the bundle ID
        String::new()
      }
    }
  }

  #[napi(getter)]
  pub fn name(&self) -> String {
    self.app.name.clone()
  }

  #[napi(getter)]
  pub fn object_id(&self) -> u32 {
    self.object_id
  }

  #[napi(getter)]
  pub fn icon(&self) -> Result<Buffer> {
    self.app.icon()
  }

  #[napi(getter)]
  pub fn get_is_running(&self) -> Result<bool> {
    // Use catch_unwind to prevent any panics
    let result = std::panic::catch_unwind(|| {
      match get_process_property(&self.object_id, kAudioProcessPropertyIsRunningInput) {
        Ok(is_running) => Ok(is_running),
        Err(_) => Ok(false),
      }
    });

    // Handle any panics
    match result {
      Ok(result) => result,
      Err(_) => Ok(false),
    }
  }

  #[napi]
  pub fn tap_audio(
    &self,
    audio_stream_callback: Arc<ThreadsafeFunction<Float32Array, (), Float32Array, true>>,
  ) -> Result<AudioCaptureSession> {
    // Use AggregateDeviceManager instead of AggregateDevice directly
    // This provides automatic default device change detection
    let mut device_manager = AggregateDeviceManager::new(self)?;
    device_manager.start_capture(audio_stream_callback)?;
    let boxed_manager = Box::new(device_manager);
    Ok(AudioCaptureSession::new(boxed_manager))
  }
}

#[napi]
pub struct ApplicationListChangedSubscriber {
  listener_block: RcBlock<dyn Fn(u32, *mut c_void)>,
}

#[napi]
impl ApplicationListChangedSubscriber {
  #[napi]
  pub fn unsubscribe(&self) -> Result<()> {
    let status = unsafe {
      AudioObjectRemovePropertyListenerBlock(
        kAudioObjectSystemObject,
        &AudioObjectPropertyAddress {
          mSelector: kAudioHardwarePropertyProcessObjectList,
          mScope: kAudioObjectPropertyScopeGlobal,
          mElement: kAudioObjectPropertyElementMain,
        },
        ptr::null_mut(),
        (&*self.listener_block as *const Block<dyn Fn(u32, *mut c_void)>)
          .cast_mut()
          .cast(),
      )
    };
    if status != 0 {
      return Err(Error::new(
        Status::GenericFailure,
        "Failed to remove property listener",
      ));
    }
    Ok(())
  }
}

#[napi]
pub struct ApplicationStateChangedSubscriber {
  id: Uuid,
  object_id: AudioObjectID,
}

#[napi]
impl ApplicationStateChangedSubscriber {
  #[napi]
  pub fn unsubscribe(&self) {
    if let Ok(mut lock) = APPLICATION_STATE_CHANGED_SUBSCRIBERS.write() {
      if let Some(subscribers) = lock.get_mut(&self.object_id) {
        subscribers.remove(&self.id);
        if subscribers.is_empty() {
          lock.remove(&self.object_id);
          if let Some(listener_block) = APPLICATION_STATE_CHANGED_LISTENER_BLOCKS
            .write()
            .ok()
            .as_mut()
            .and_then(|map| map.remove(&self.object_id))
          {
            unsafe {
              AudioObjectRemovePropertyListenerBlock(
                self.object_id,
                &AudioObjectPropertyAddress {
                  mSelector: kAudioProcessPropertyIsRunning,
                  mScope: kAudioObjectPropertyScopeGlobal,
                  mElement: kAudioObjectPropertyElementMain,
                },
                ptr::null_mut(),
                listener_block.load(Ordering::Relaxed),
              );
            }
          }
        }
      }
    }
  }
}

#[napi]
pub struct ShareableContent {
  _inner: SCShareableContent,
}

#[napi]
#[derive(Default)]
pub struct RecordingPermissions {
  pub audio: bool,
  pub screen: bool,
}

#[napi]
impl ShareableContent {
  #[napi]
  pub fn on_application_list_changed(
    callback: Arc<ThreadsafeFunction<(), ()>>,
  ) -> Result<ApplicationListChangedSubscriber> {
    let callback_block: RcBlock<dyn Fn(u32, *mut c_void)> =
      RcBlock::new(move |_in_number_addresses, _in_addresses: *mut c_void| {
        if let Err(err) = RUNNING_APPLICATIONS
          .write()
          .map_err(|_| {
            Error::new(
              Status::GenericFailure,
              "Poisoned RwLock while writing RunningApplications",
            )
          })
          .map(|mut running_applications| {
            *running_applications = audio_process_list();
          })
        {
          callback.call(Err(err), ThreadsafeFunctionCallMode::NonBlocking);
        } else {
          callback.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
        }
      });

    let status = unsafe {
      AudioObjectAddPropertyListenerBlock(
        kAudioObjectSystemObject,
        &AudioObjectPropertyAddress {
          mSelector: kAudioHardwarePropertyProcessObjectList,
          mScope: kAudioObjectPropertyScopeGlobal,
          mElement: kAudioObjectPropertyElementMain,
        },
        ptr::null_mut(),
        (&*callback_block as *const Block<dyn Fn(u32, *mut c_void)>)
          .cast_mut()
          .cast(),
      )
    };
    if status != 0 {
      return Err(Error::new(
        Status::GenericFailure,
        "Failed to add property listener",
      ));
    }
    Ok(ApplicationListChangedSubscriber {
      listener_block: callback_block,
    })
  }

  #[napi]
  pub fn on_app_state_changed(
    app: &TappableApplication,
    callback: Arc<ThreadsafeFunction<(), ()>>,
  ) -> Result<ApplicationStateChangedSubscriber> {
    let id = Uuid::new_v4();
    let object_id = app.object_id;

    let mut lock = APPLICATION_STATE_CHANGED_SUBSCRIBERS.write().map_err(|_| {
      Error::new(
        Status::GenericFailure,
        "Poisoned RwLock while writing ApplicationStateChangedSubscribers",
      )
    })?;

    if let Some(subscribers) = lock.get_mut(&object_id) {
      subscribers.insert(id, callback);
    } else {
      let list_change: RcBlock<dyn Fn(u32, *mut c_void)> =
        RcBlock::new(move |in_number_addresses, in_addresses: *mut c_void| {
          let addresses = unsafe {
            std::slice::from_raw_parts(
              in_addresses as *mut AudioObjectPropertyAddress,
              in_number_addresses as usize,
            )
          };
          for address in addresses {
            if address.mSelector == kAudioProcessPropertyIsRunning {
              if let Some(subscribers) = APPLICATION_STATE_CHANGED_SUBSCRIBERS
                .read()
                .ok()
                .as_ref()
                .and_then(|map| map.get(&object_id))
              {
                for callback in subscribers.values() {
                  callback.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
                }
              }
            }
          }
        });
      let address = AudioObjectPropertyAddress {
        mSelector: kAudioProcessPropertyIsRunning,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain,
      };
      let listener_block = &*list_change as *const Block<dyn Fn(u32, *mut c_void)>;
      let status = unsafe {
        AudioObjectAddPropertyListenerBlock(
          object_id,
          &address,
          ptr::null_mut(),
          listener_block.cast_mut().cast(),
        )
      };
      if status != 0 {
        return Err(Error::new(
          Status::GenericFailure,
          "Failed to add property listener",
        ));
      }
      let subscribers = {
        let mut map = HashMap::new();
        map.insert(id, callback);
        map
      };
      lock.insert(object_id, subscribers);
    }
    Ok(ApplicationStateChangedSubscriber { id, object_id })
  }

  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Ok(Self {
      _inner: SCShareableContent::get().map_err(|err| Error::new(Status::GenericFailure, err))?,
    })
  }

  #[napi]
  pub fn applications(&self) -> Result<Vec<TappableApplication>> {
    let app_list = RUNNING_APPLICATIONS
      .read()
      .map_err(|_| {
        Error::new(
          Status::GenericFailure,
          "Poisoned RwLock while reading RunningApplications",
        )
      })?
      .iter()
      .flatten()
      .filter_map(|id| {
        let tappable_app = match TappableApplication::new(*id) {
          Ok(app) => app,
          Err(_) => return None,
        };

        if !tappable_app.bundle_identifier().is_empty() {
          Some(tappable_app)
        } else {
          None
        }
      })
      .collect::<Vec<_>>();

    Ok(app_list)
  }

  #[napi]
  pub fn application_with_process_id(&self, process_id: u32) -> Option<Application> {
    // Get NSRunningApplication class
    let running_app_class = NSRUNNING_APPLICATION_CLASS.as_ref()?;

    // Get running application with PID
    let running_app: *mut AnyObject = unsafe {
      msg_send![
        *running_app_class,
        runningApplicationWithProcessIdentifier: process_id as i32
      ]
    };

    if running_app.is_null() {
      return None;
    }

    // Create an Application directly
    Application::new(process_id as i32).ok()
  }

  #[napi]
  pub fn tappable_application_with_process_id(
    &self,
    process_id: u32,
  ) -> Option<TappableApplication> {
    // Find the TappableApplication with this process ID in the list of running
    // applications
    match self.applications() {
      Ok(apps) => {
        for app in apps {
          if app.process_id() == process_id as i32 {
            return Some(app);
          }
        }

        // If we couldn't find a TappableApplication with this process ID, create a new
        // one with a default object_id of 0 (which won't be able to tap audio)
        match Application::new(process_id as i32) {
          Ok(app) => Some(TappableApplication::from_application(&app, 0)),
          Err(_) => None,
        }
      }
      Err(_) => None,
    }
  }

  #[napi]
  pub fn tap_global_audio(
    excluded_processes: Option<Vec<&TappableApplication>>,
    audio_stream_callback: Arc<ThreadsafeFunction<Float32Array, (), Float32Array, true>>,
  ) -> Result<AudioCaptureSession> {
    let excluded_object_ids = excluded_processes
      .unwrap_or_default()
      .iter()
      .map(|app| app.object_id)
      .collect::<Vec<_>>();

    // Use the new AggregateDeviceManager for automatic device adaptation
    let mut device_manager = AggregateDeviceManager::new_global(&excluded_object_ids)?;
    device_manager.start_capture(audio_stream_callback)?;
    let boxed_manager = Box::new(device_manager);
    Ok(AudioCaptureSession::new(boxed_manager))
  }
}
