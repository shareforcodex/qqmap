//global var -->

const TEXTMARKSIZE = 10;
const TEXTMARKCOLOR = "#111111";
const CURRENT_LOCATION_LABEL_NAME = "↑";
const DEFAULT_COORDS = {
  lat: 31.922023,
  lng: 117.342314
}


const labelsNameInStorage = "mapMarks";
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


let multiLabelsLayer = new TMap.MultiLabel({
  id: "normal-textlabel-layer",
  map: null,
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
let currentLocationLayer = new TMap.MultiLabel({
  id: "current-location-mark-layer",
  map: null,
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
window.addEventListener(
  "deviceorientationabsolute",
  (e) => {
    currentDirection = Math.round(e.alpha);
    arrowdiv.style.transform = `rotate(${-currentDirection + 270
      }deg)`;
    currentLocationLayer.setStyles({
      blue: new TMap.LabelStyle({
        color: "#0000ff", //颜色属性
        size: TEXTMARKSIZE * 3, //文字大小属性
        offset: { x: 0, y: 0 }, //文字偏移属性单位为像素
        angle: currentDirection, //文字旋转属性
        alignment: "center", //文字水平对齐属性
        verticalAlignment: "middle", //文字垂直对齐属性
      }),
    });
  },
  true
);


let currentLocLabel;
let selectedLabel;
let currentGcjLatLng;

let tg = {};
let tg1 = {};

let markPrefixInput =
  document.querySelector("#markPrefixInput");
let deleteMarkButton = document.querySelector("#deleteMark");
let markDetailDisplay = document.querySelector("#markDetail");
let markDetailUl = document.querySelector("#markDetailUl");
let showCurrentButton =
  document.querySelector("#showCurrent");
let hideButton = document.querySelector("#hideDetail");

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


// <!--main logical function -->

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
  //初始化地图
  qqMap = new TMap.Map("container", {
    rotation: 0, //设置地图旋转角度
    pitch: 0, //设置俯仰角度（0~45）
    zoom: 18, //设置地图缩放级别
    center: qqMapCenter, //设置地图中心点坐标
    viewMode: "2D",
    mapStyleId: "style2",
  });
  qqMap.setDoubleClickZoom(false);
  multiLabelsLayer.setMap(qqMap);
  currentLocationLayer.setMap(qqMap);
  multiLabelsLayer.on("click", (evt) => {
    console.log("lable clicked", evt);
    markDetailUl.style.display = "inherit";
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
      detail: markPrefixInput.value,
      lat: pickedCoords.lat,
      lng: pickedCoords.lng,
    };
    model.updateLabel(targetLabel);
  }
  );

  qqMap.on("click", (evt) => {


    let gcjCoords = evt.latLng;
    pickedCoords = gcj2wgs(
      gcjCoords.lat,
      gcjCoords.lng
    );
    console.log(pickedCoords);

    drawLabels({
      minLat: pickedCoords.lat - 0.002,
      minLng: pickedCoords.lng - 0.002,
      maxLat: pickedCoords.lat + 0.002,
      maxLng: pickedCoords.lng + 0.002,
    })
    // if (markPrefixInput.value.length < 1) {

    //   return;
    // }

  });

  navigator.geolocation.watchPosition(
    (pos) => {
      console.log(
        "locatin changed to",
        pos.coords
      );
      var coords = pos.coords;
      let gcjCoords = wgs2gcj(
        coords.latitude,
        coords.longitude
      );
      currentGcjLatLng = gcjCoords;
      postionDisplay.innerHTML =
        "" +
        coords.latitude.toFixed(6) +
        "," +
        coords.longitude.toFixed(6);

      console.log("location changed");
      model.updateMap({
        ...model.map,
        currentLatLng: {
          lat: coords.latitude,
          lng: coords.longitude,
        },
      });
    },
    error,
    options
  );

}
function error(err) {
  postionDisplay.innerHTML = "cant get location info";
  console.warn(`ERROR(${err.code}): ${err.message}`);
}


// <!--execute main function and additional appfunction-- >

initMap();

hideButton.addEventListener("click", (evt) => {
  markDetailUl.style.display = "none";
});

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

document
  .querySelector("#toogleMarkModeButton")
  .addEventListener("click", (e) => {
    if (markPrefixInput.value) {
      markPrefixInput.value = "";
    } else {
      markPrefixInput.value = "1";
    }
  });
showCurrentButton.addEventListener("pointerdown", () => {
  console.log("center map now");
  setCenter(
    qqMap,
    currentGcjLatLng.lat,
    currentGcjLatLng.lng
  );
  qqMap.setRotation(0);
  qqMap.setPitch(0);
  qqMap.setZoom(17);
});

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

