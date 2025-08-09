//global var -->

const TEXTMARKSIZE = 10;
const TEXTMARKCOLOR = "#111111";
const CURRENT_LOCATION_LABEL_NAME = "↑";
const DEFAULT_COORDS = {
  lat: 31.922023,
  lng: 117.342314
}


const labelsNameInStorage = "mapMarks";
const selectedPositionStorageKey = "selectedPosition";
const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 2000,
};
const district = "test";
const locationRefreshRateTime = 2000;

let qqMap;
let currentDirection = 0;
let pickedCoords = {};
let geoWatchId = null;
let motionPermissionState = "unknown";
let orientationListenersAdded = false;


let multiLabelsLayer = null;
let currentLocationLayer = null;
let selectedLocationLayer = null;


// Motion/orientation handling for iOS Safari and others
function computeHeadingFromEvent(event) {
  if (typeof event.webkitCompassHeading === "number" && !isNaN(event.webkitCompassHeading)) {
    return event.webkitCompassHeading; // iOS (Safari/Chrome)
  }
  if (typeof event.alpha === "number") {
    const screenOrientation = (screen.orientation && typeof screen.orientation.angle === "number")
      ? screen.orientation.angle
      : (typeof window.orientation === "number" ? window.orientation : 0);
    // Use 360 - alpha to convert to compass heading, then adjust by screen orientation
    let heading = 360 - event.alpha + (screenOrientation || 0);
    heading %= 360;
    if (heading < 0) heading += 360;
    return heading;
  }
  return null;
}

function handleOrientation(event) {
  const computed = computeHeadingFromEvent(event);
  if (computed == null) return;
  currentDirection = Math.round(computed);
  if (arrowdiv) {
    arrowdiv.style.transform = `rotate(${currentDirection + 270}deg)`;
  }
  if (currentLocationLayer && typeof TMap !== "undefined") {
    currentLocationLayer.setStyles({
      blue: new TMap.LabelStyle({
        color: "#0000ff",
        size: TEXTMARKSIZE * 3,
        offset: { x: 0, y: 0 },
        angle: -currentDirection,
        alignment: "center",
        verticalAlignment: "middle",
      }),
    });
  }
}

function addOrientationListenersAfterPermission() {
  if (orientationListenersAdded) return;
  // Attach both for robustness; browsers will fire the one they support
  window.addEventListener("deviceorientation", handleOrientation, true);
  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  // Recompute on screen orientation change
  window.addEventListener("orientationchange", () => {}, true);
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener("change", () => {}, { passive: true });
  }
  orientationListenersAdded = true;
}

function requestIOSMotionPermissionIfNeeded() {
  const Orientation = window.DeviceOrientationEvent;
  const Motion = window.DeviceMotionEvent;

  const hasOrientationAPI = Orientation && typeof Orientation.requestPermission === "function";
  const hasMotionAPI = Motion && typeof Motion.requestPermission === "function";

  if (hasOrientationAPI || hasMotionAPI) {
    const requests = [];
    if (hasOrientationAPI) requests.push(Orientation.requestPermission().catch(() => "denied"));
    if (hasMotionAPI) requests.push(Motion.requestPermission().catch(() => "denied"));

    return Promise.all(requests).then((states) => {
      // Consider granted if any returns granted
      const granted = states.some((s) => s === "granted");
      motionPermissionState = granted ? "granted" : "denied";
      if (granted) addOrientationListenersAfterPermission();
      return motionPermissionState;
    });
  } else {
    // No permission API (non-iOS); just add listeners
    addOrientationListenersAfterPermission();
    motionPermissionState = "granted";
    return Promise.resolve("granted");
  }
}


let currentLocLabel;
let selectedLabel;
let currentGcjLatLng;

let tg = {};
let tg1 = {};

let deleteMarkButton = document.querySelector("#deleteMark");
let markDetailDisplay = document.querySelector("#markDetail");
let markDetailUl = document.querySelector("#markDetailUl");
let showCurrentButton =
  document.querySelector("#showCurrent");
let enableSensorsButton = document.querySelector("#enableSensors");
let hideButton = document.querySelector("#hideDetail");
let moreButton = document.querySelector("#moreButton");
let moreMenu = document.querySelector("#moreMenu");

// Explicitly bind DOM elements by id to avoid relying on non-standard globals
const postionDisplay = document.getElementById("postionDisplay");
const exportButton = document.getElementById("exportButton");
const arrowdiv = document.getElementById("arrowdiv");
const labelIdInput = document.getElementById("labelIdInput");
const labelNameInput = document.getElementById("labelNameInput");
const labelDetailInput = document.getElementById("labelDetailInput");

let selectedMarkID = "";
markDetailUl.style.display = "none";


//          < !--model -->

let model = {
  map: {
    rotation: 0,
    zoom: 18,
    center: null,
    currentLatLng: { lat: 0, lng: 0 },
  },
  labels: {},

  updateMap: function (newMap) {
    console.log("updateMap");
    let map = model.map;
    if (map.rotation !== newMap.rotation) {
    }
    if (map.zoom !== newMap.zoom) {
    }
    if (map.center !== newMap.center) {
    }
    if (
      newMap.currentLatLng !==
      model.map.currentLatLng
    ) {
      console.log(
        "differ loc",
        model.map.currentLatLng,
        newMap.currentLatLng
      );
      let label = {
        id:
          "current_loc" +
          newMap.currentLatLng.lat +
          "_" +
          newMap.currentLatLng.lng,
        name: CURRENT_LOCATION_LABEL_NAME,
        detail: "current location",
        lat: newMap.currentLatLng.lat,
        lng: newMap.currentLatLng.lng,
      };
      let gcjLoc = wgs2gcj(label.lat, label.lng);

      currentLocationLayer.setGeometries([
        {
          id: label.id, //点图形数据的标志信息
          styleId: "blue", //样式id
          position: new TMap.LatLng(
            gcjLoc.lat,
            gcjLoc.lng
          ), //标注点位置
          content: label.name, //标注文本
          properties: {
            //标注点的属性数据
            title: "label",
          },
        },
      ]);
    }

    model.map = newMap;
  },

  updateLabel: function (newLabel) {
    console.log(
      "before updateLabel",
      model.labels,
      newLabel
    );
    if (model.labels[newLabel.id]) {
      if (
        model.labels[newLabel.id].id ===
        newLabel.id
      ) {
        console.log(
          "labed exited will modify"
        );
      }
    }
    model.labels[newLabel.id] = newLabel;
    console.log(model.labels);
    updateLabelInStrogeLabel(
      labelsNameInStorage,
      newLabel
    );
    selectedLabel = drawLabel(newLabel);
  },
  initLabels: function () {
    let labelsInStorage =
      getObjFromStorage(labelsNameInStorage);
    for (const i of Object.values(labelsInStorage)) {
      drawLabel(i);
    }

    model.labels = { ...labelsInStorage };
  },
  deleteLabel: function (id) {
    console.log(model.labels);
    delete model.labels[id];
    console.log(model.labels);
    setObjToStorage(
      labelsNameInStorage,
      model.labels
    );
    selectedLabel = null;
  },
};


hideButton.addEventListener("click", () => {
  const isHidden = markDetailUl.style.display === "none" || !markDetailUl.style.display;
  markDetailUl.style.display = isHidden ? "block" : "none";
});

// More dropdown interactions
if (moreButton && moreMenu) {
  const toggleMenu = () => {
    const isOpen = moreMenu.style.display === "block";
    moreMenu.style.display = isOpen ? "none" : "block";
  };
  moreButton.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  document.addEventListener("click", () => {
    moreMenu.style.display = "none";
  });
}

deleteMarkButton.addEventListener("click", (e) => {
  model.deleteLabel(selectedLabel.id);
  drawLabels({
    minLat: pickedCoords.lat - 0.002,
    minLng: pickedCoords.lng - 0.002,
    maxLat: pickedCoords.lat + 0.002,
    maxLng: pickedCoords.lng + 0.002,
  })
});

document
  .querySelector("#labelSaveButton")
  .addEventListener("click", (e) => {
    console.log("save label");
    let oldLabel =
      getObjFromStorage(labelsNameInStorage)[
      selectedLabel.id
      ];
    let newLabel = {
      ...oldLabel,
      name: labelNameInput.value,
      detail: labelDetailInput.value,
    };
    model.updateLabel(newLabel);
  });

showCurrentButton.addEventListener("pointerdown", () => {
  console.log("center map now");
  // Try to enable motion sensors on user gesture for iOS Safari/Chrome
  requestIOSMotionPermissionIfNeeded();
  startGeolocation({ forceRecenter: true });
});

if (enableSensorsButton) {
  enableSensorsButton.addEventListener("click", () => {
    requestIOSMotionPermissionIfNeeded().then((state) => {
      if (state !== "granted") {
        alert("Please allow Motion & Orientation access in Safari Settings > Website Settings.");
      }
    });
  });
}

exportButton.addEventListener("click", () => {
  console.log("export json");
  let exportStr =
    localStorage.getItem(labelsNameInStorage);
  console.log(exportStr);
  const blob = new Blob([exportStr], {
    type: "application/json",
  });
  let exportFileUrl = URL.createObjectURL(blob);
  window.open(exportFileUrl);
});



function drawLabel(label, size, color, isgcj = true) {
  let gcjLatLng = wgs2gcj(label.lat, label.lng);
  if (isgcj) {
    gcjLatLng.lat;
    gcjLatLng.lng;
  }
  multiLabelsLayer.setGeometries([
    ...multiLabelsLayer.getGeometries(),
    {
      id: label.id, //点图形数据的标志信息
      styleId: "label", //样式id
      position: new TMap.LatLng(
        gcjLatLng.lat,
        gcjLatLng.lng
      ), //标注点位置
      content: label.name, //标注文本
      properties: {
        //标注点的属性数据
        title: "label",
      },
    },
  ]);
  //初始化label
  // let labelMarker = new TMap.MultiLabel({
  //     id: label.id,
  //     map: qqMap,
  //     enableCollision: true,
  //     styles: {
  //         'label': new TMap.LabelStyle({
  //             'color': color || '#000000', //颜色属性
  //             'size': size || 19, //文字大小属性
  //             'offset': {x: 0, y: 0 }, //文字偏移属性单位为像素
  //             'angle': 0, //文字旋转属性
  //             'alignment': 'left', //文字水平对齐属性
  //             'verticalAlignment': 'top' //文字垂直对齐属性
  //         })
  //     },
  //     geometries: [{
  //         'id': label.id + 'geometries', //点图形数据的标志信息
  //         'styleId': 'label', //样式id
  //         'position': new TMap.LatLng(gcjLatLng.lat, gcjLatLng.lng), //标注点位置
  //         'content': label.name, //标注文本
  //         'properties': { //标注点的属性数据
  //             'title': 'label'
  //         }
  //     }]
  // });

  // // if (label.id[0] === 'c') return;
  // labelMarker.on('click', evt => {
  //     console.log('lable clicked', evt);
  //     markDetailUl.style.display = 'inherit';
  //     selectedLabel = evt.target;
  //     selectedMarkID = evt.target.id;
  //     let glatLng = evt.latLng;
  //     let latLng = gcj2wgs(glatLng.lat, glatLng.lng)

  //     labelIdInput.value = selectedMarkID;
  //     labelNameInput.value = model.labels[selectedMarkID]['name'];
  //     labelDetailInput.value = model.labels[selectedMarkID]['detail'];

  // })

  return;
}

function drawLabels(range) {
  model.labels = getObjFromStorage(labelsNameInStorage);
  multiLabelsLayer.setGeometries([]);
  for (let label in model.labels) {
    if (model.labels.hasOwnProperty(label)) {
      if (model.labels[label].lat > range.minLat && model.labels[label].lat < range.maxLat) {
        if (model.labels[label].lng > range.minLng && model.labels[label].lng < range.maxLng) {
          drawLabel(model.labels[label], model.labels[label].size, model.labels[label].color);
        }
      }
    }
  }
}

function setCenter(map, lat, lng) {
  qqMap.setCenter(new TMap.LatLng(lat, lng)); //坐标为天安门
}

function getObjFromStorage(name) {
  return (
    JSON.parse(window.localStorage.getItem(name)) ||
    {}
  );
}

function setObjToStorage(name, obj) {
  window.localStorage.setItem(name, JSON.stringify(obj));
}

function updateLabelInStrogeLabel(name, label) {
  let labels = getObjFromStorage(name);
  labels[label.id] = label;
  setObjToStorage(name, labels);
}

function error(err) {
  postionDisplay.innerHTML = "cant get location info";
  console.warn(`ERROR(${err.code}): ${err.message}`);
}





function initMap() {
  console.log("start initMap");

  /*  console.log(pos)
coords: GeolocationCoordinates
latitude: 31.230416
longitude: 121.473701
accuracy: 150
altitude: null
altitudeAccuracy: null
heading: null
speed: null
__proto__: GeolocationCoordinates
timestamp: 1620128266841 */
  let coords = DEFAULT_COORDS
  let gcjCoords = wgs2gcj(
    coords.lat,
    coords.lng
  );

  currentGcjLatLng = gcjCoords;
  /*console.log(gcjCoords)
{
lat: 31.228473709359033
lng: 121.47822413398089
}*/
  let qqMapCenter = new TMap.LatLng(
    gcjCoords.lat,
    gcjCoords.lng
  );
  /*console.log(qqMapCenter)
height: 0
lat: 31.228473709359033
lng: 121.47822413398089
*/
  // //初始化地图
  // qqMap = new TMap.Map("container", {
  //   rotation: 0, //设置地图旋转角度
  //   pitch: 0, //设置俯仰角度（0~45）
  //   zoom: 18, //设置地图缩放级别
  //   center: qqMapCenter, //设置地图中心点坐标
  //   viewMode: "2D",
  //   mapStyleId: "style2",
  // });

  qqMap = new TMap.Map('container', {
    zoom: 17, // 设置地图缩放
    center: new TMap.LatLng(39.98210863924864, 116.31310899739151), // 设置地图中心点坐标，
    pitch: 0, // 俯仰度
    rotation: 0, // 旋转角度
    viewMode:'2D'
               
  });
  qqMap.setRotatable(false);



  //todo
  qqMap.setDoubleClickZoom(false);


   multiLabelsLayer = new TMap.MultiLabel({
    id: "normal-textlabel-layer",
    map: qqMap,
    styles: {
      label: new TMap.LabelStyle({
        color: TEXTMARKCOLOR, //颜色属性
        size: TEXTMARKSIZE, //文字大小属性
        offset: { x: 0, y: 0 }, //文字偏移属性单位为像素
        angle: 0, //文字旋转属性
        alignment: "left", //文字水平对齐属性
        verticalAlignment: "top", //文字垂直对齐属性
      }),
    },
    geometries: [],
  });
   currentLocationLayer = new TMap.MultiLabel({
    id: "current-location-mark-layer",
    map: qqMap,
    styles: {
      blue: new TMap.LabelStyle({
        color: "#0000ff", //颜色属性
        size: TEXTMARKSIZE * 4, //文字大小属性
        offset: { x: 0, y: 0 }, //文字偏移属性单位为像素
        angle: 0, //文字旋转属性
        alignment: "center", //文字水平对齐属性
        verticalAlignment: "middle", //文字垂直对齐属性
      }),
    },
    geometries: [],
  });

  // Selected location single-marker layer
  selectedLocationLayer = new TMap.MultiLabel({
    id: "selected-location-mark-layer",
    map: qqMap,
    styles: {
      selected: new TMap.LabelStyle({
        color: "#e11d48", // red
        size: TEXTMARKSIZE * 4,
        offset: { x: 0, y: 0 },
        angle: 0,
        alignment: "center",
        verticalAlignment: "middle",
      }),
    },
    geometries: [],
  });

  multiLabelsLayer.setMap(qqMap);
  currentLocationLayer.setMap(qqMap);
  selectedLocationLayer.setMap(qqMap);
  multiLabelsLayer.on("click", (evt) => {
    console.log("lable clicked", evt);
    markDetailUl.style.display = "block";
    selectedLabel = evt.geometry;
    selectedMarkID = selectedLabel.id;
    let glatLng = evt.latLng;
    let latLng = gcj2wgs(
      glatLng.lat,
      glatLng.lng
    );

    labelIdInput.value = selectedMarkID;
    labelNameInput.value =
      model.labels[selectedMarkID]["name"];
    labelDetailInput.value =
      model.labels[selectedMarkID][
      "detail"
      ];
  });

  model.updateMap({
    ...model.map,
    currentLatLng: {
      lat: coords.lat,
      lng: coords.lng,
    },
  });
  // setTimeout(() => {
  //   model.initLabels();
  // }, 5000);

  //监听点击事件添加marker

  qqMap.on("dblclick", (evt) => {
    console.log("dblclick", evt);

    let gcjCoords = evt.latLng;
    pickedCoords = gcj2wgs(
      gcjCoords.lat,
      gcjCoords.lng
    );
    console.log(pickedCoords);

    let name = prompt("location title");
    if (name.length < 1) {
      return;
    }

    let targetLabel = {
      id:
        "label_" +
        pickedCoords.lat +
        "_" +
        pickedCoords.lng,
      name: name,
      detail: "",
      lat: pickedCoords.lat,
      lng: pickedCoords.lng,
    };
    model.updateLabel(targetLabel);
  }
  );

  qqMap.on("click", (evt) => {
    // Convert clicked point to WGS and store as selected position
    const gcjCoords = evt.latLng;
    pickedCoords = gcj2wgs(gcjCoords.lat, gcjCoords.lng);
    console.log("selected position (wgs)", pickedCoords);
    try {
      window.localStorage.setItem(
        selectedPositionStorageKey,
        JSON.stringify(pickedCoords)
      );
    } catch (_) {}

    // Draw single selected marker (clears previous)
    selectedLocationLayer.setGeometries([
      {
        id: "selected_position",
        styleId: "selected",
        position: new TMap.LatLng(gcjCoords.lat, gcjCoords.lng),
        content: "✚",
        properties: { title: "selected" },
      },
    ]);

    // Refresh nearby labels as before
    drawLabels({
      minLat: pickedCoords.lat - 0.002,
      minLng: pickedCoords.lng - 0.002,
      maxLat: pickedCoords.lat + 0.002,
      maxLng: pickedCoords.lng + 0.002,
    });
  });

  // Start geolocation flow (will prompt on Safari if needed)
  startGeolocation();

  // Try to add orientation listeners immediately on platforms that don't need explicit permission
  const Orientation = window.DeviceOrientationEvent;
  if (!(Orientation && typeof Orientation.requestPermission === "function")) {
    addOrientationListenersAfterPermission();
  }

  // On first user interaction anywhere, request motion permission once (iOS Safari/Chrome)
  const oneTimeEnable = (evt) => {
    requestIOSMotionPermissionIfNeeded();
    document.removeEventListener("pointerdown", oneTimeEnable);
  };
  document.addEventListener("pointerdown", oneTimeEnable, { passive: true, once: true });

  // Restore previously selected position if any
  try {
    const stored = window.localStorage.getItem(selectedPositionStorageKey);
    if (stored) {
      const wgs = JSON.parse(stored);
      if (wgs && typeof wgs.lat === "number" && typeof wgs.lng === "number") {
        const gcj = wgs2gcj(wgs.lat, wgs.lng);
        selectedLocationLayer.setGeometries([
          {
            id: "selected_position",
            styleId: "selected",
            position: new TMap.LatLng(gcj.lat, gcj.lng),
            content: "✚",
            properties: { title: "selected" },
          },
        ]);
        pickedCoords = wgs;
      }
    }
  } catch (_) {}
}


// iOS requires user gesture to enable motion. Show helper button and init map immediately.
initMap();

// ----- Geolocation helpers (better iOS Safari handling) -----
function handlePositionUpdate(coords) {
  const gcjCoords = wgs2gcj(coords.latitude, coords.longitude);
  currentGcjLatLng = gcjCoords;
  try {
    postionDisplay.innerHTML = `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
  } catch (_) {}
  model.updateMap({
    ...model.map,
    currentLatLng: {
      lat: coords.latitude,
      lng: coords.longitude,
    },
  });
}

function startGeolocation({ forceRecenter = false } = {}) {
  if (!("geolocation" in navigator)) {
    console.warn("Geolocation API not available in this browser.");
    return;
  }

  // One-shot call to trigger permission prompt (especially for iOS Safari)
  try {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePositionUpdate(pos.coords);
        if (forceRecenter && currentGcjLatLng) {
          setCenter(qqMap, currentGcjLatLng.lat, currentGcjLatLng.lng);
          qqMap.setRotation(0);
          qqMap.setPitch(0);
          qqMap.setZoom(17);
        }
      },
      error,
      options
    );
  } catch (_) {}

  // Start watching only once
  if (geoWatchId == null) {
    try {
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          console.log("locatin changed to", pos.coords);
          handlePositionUpdate(pos.coords);
        },
        error,
        options
      );
    } catch (_) {}
  }
}
