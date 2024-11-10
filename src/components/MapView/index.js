import React, { useEffect, useState } from "react";
import * as exifr from "exifr";
import { Input, Select, message } from "antd";

const { Option } = Select;

const styles = {
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // 确保地图在输入框下面
  },
  fileInputContainer: {
    display: "flex",
    width: "300px",
    position: "absolute", // 改为相对定位
    backgroundColor: "white",
    top: "10px",
    left: "10px",
    padding: "10px",
    borderRadius: "5px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    marginBottom: "10px", // 添加底部外边距
    zIndex: 10, // 确保输入框在地图上面
  },
  fileInput: {
    width: "70%",
    padding: "3px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "16px",
    marginRight: "10px",
    cursor: "pointer",
    transition: "border-color 0.3s",
  },
  yearSelector: {
    padding: "3px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "16px",
    cursor: "pointer",
    transition: "border-color 0.3s",
  },
  modal: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(10px)", // 添加高斯模糊效果
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "10px",
    width: "800px",
    height: "600px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    backgroundColor: "red",
    color: "white",
    border: "none",
    borderRadius: "5px",
    padding: "5px 10px",
    cursor: "pointer",
  },
};

const getDecimalFromDMS = (dms, direction) => {
  const degrees = dms[0];
  const minutes = dms[1] / 60;
  const seconds = dms[2] / 3600;
  const decimal = degrees + minutes + seconds;
  return direction === "S" || direction === "W" ? -decimal : decimal;
};

const Modal = ({ imageUrl, onClose }) => (
  <div style={styles.modal} onClick={onClose}>
    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <button style={styles.closeButton} onClick={onClose}>
        关闭
      </button>
      <img
        src={imageUrl}
        alt="Large view"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  </div>
);

const wgs84ToGcj02 = (lat, lon) => {
  const pi = 3.1415926535897932384626;
  const a = 6378245.0;
  const ee = 0.00669342162296594323;

  const transformLat = (x, y) => {
    let ret =
      -100.0 +
      2.0 * x +
      3.0 * y +
      0.2 * y * y +
      0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x));
    ret +=
      ((20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0) /
      3.0;
    ret +=
      ((20.0 * Math.sin(y * pi) + 40.0 * Math.sin((y / 3.0) * pi)) * 2.0) / 3.0;
    ret +=
      ((160.0 * Math.sin((y / 12.0) * pi) + 320 * Math.sin((y * pi) / 30.0)) *
        2.0) /
      3.0;
    return ret;
  };

  const transformLon = (x, y) => {
    let ret =
      300.0 +
      x +
      2.0 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    ret +=
      ((20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0) /
      3.0;
    ret +=
      ((20.0 * Math.sin(x * pi) + 40.0 * Math.sin((x / 3.0) * pi)) * 2.0) / 3.0;
    ret +=
      ((150.0 * Math.sin((x / 12.0) * pi) + 300.0 * Math.sin((x / 30.0) * pi)) *
        2.0) /
      3.0;
    return ret;
  };

  const delta = (lat, lon) => {
    const dLat = transformLat(lon - 105.0, lat - 35.0);
    const dLon = transformLon(lon - 105.0, lat - 35.0);
    const radLat = (lat / 180.0) * pi;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    const dLatFinal =
      (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * pi);
    const dLonFinal =
      (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * pi);
    return { lat: dLatFinal, lon: dLonFinal };
  };

  const { lat: dLat, lon: dLon } = delta(lat, lon);
  return { lat: lat + dLat, lon: lon + dLon };
};

const MapView = () => {
  const [map, setMap] = useState(null);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [images, setImages] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");

  useEffect(() => {
    if (window.AMap) {
      const initialMap = new window.AMap.Map("map", {
        center: [104.1954, 35.8617],
        zoom: 5,
      });

      setMap(initialMap);

      return () => {
        initialMap.destroy();
      };
    }
  }, []);

  const handleFilesChange = async (event) => {
    const files = event.target.files;
    const newImages = [];
    let processedFiles = 0;

    const validFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/") && file.size > 0
    );

    for (const file of validFiles) {
      try {
        const imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });

        const allMetaData = await exifr.parse(file);
        const lat = allMetaData.latitude;
        const lon = allMetaData.longitude;
        const dateTimeOriginal = allMetaData.DateTimeOriginal;
        const createDateTime = allMetaData.CreateDate;
        console.log("-----");
        console.log(allMetaData);

        if (lat && lon) {
          const latDecimal = lat;
          const lonDecimal = lon;
          const { lat: gcjLat, lon: gcjLon } = wgs84ToGcj02(
            latDecimal,
            lonDecimal
          );
          const position = [gcjLon, gcjLat];

          let year = "Unknown";
          if (dateTimeOriginal && typeof dateTimeOriginal === "string") {
            year = dateTimeOriginal.split(" ")[0].split(":")[0];
          }

          const marker = new window.AMap.Marker({
            position: position,
            map: map,
          });

          const infoWindow = new window.AMap.InfoWindow({
            content: `<img src="${imageUrl}" alt="Image" style="width: 100px; height: auto; cursor: pointer;" />`,
            offset: new window.AMap.Pixel(0, -30),
          });
          marker.on("click", () => {
            infoWindow.open(map, marker.getPosition());
            map.setZoomAndCenter(15, position);
          });

          infoWindow.on("open", () => {
            const img = document.querySelector(".amap-info-content img");
            if (img) {
              img.addEventListener("click", () => {
                setModalImageUrl(imageUrl);
              });
            }
          });

          newImages.push({ imageUrl, year, marker, createDateTime });

          setImages((prevImages) => {
            const sortedImages = [...prevImages, ...newImages].sort(
              (a, b) => new Date(a.createDateTime) - new Date(b.createDateTime)
            );
            return sortedImages;
          });

          const newYears = new Set(newImages.map((img) => img.year));
          setYears((prevYears) =>
            Array.from(new Set([...prevYears, ...newYears]))
          );
        } else {
          console.warn(`文件 ${file.name} 没有包含经纬度信息！`);
        }
      } catch (error) {
        console.error(`处理文件 ${file.name} 时出错:`, error);
        message.error(`处理文件 ${file.name} 时出错`);
      } finally {
        processedFiles += 1;

        if (processedFiles === validFiles.length) {
          const lastImage = newImages[newImages.length - 1];
          if (lastImage) {
            setTimeout(() => {
              map.setZoomAndCenter(15, lastImage.marker.getPosition());
            });
          }
        }
      }
    }
  };

  const handleYearChange = (value) => {
    setSelectedYear(value);

    images.forEach((img) => {
      if (value === "All" || img.year === value) {
        img.marker.show();
      } else {
        img.marker.hide();
      }
    });
  };

  return (
    <div>
      <div style={{ zIndex: 10 }}>
        <div style={styles.fileInputContainer}>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesChange}
            style={styles.fileInput}
          />
          <Select
            defaultValue="All"
            style={{ width: 120, marginLeft: 10 }}
            onChange={handleYearChange}
          >
            <Option value="All">全部年份</Option>
            {years.map((year) => (
              <Option key={year} value={year}>
                {year}
              </Option>
            ))}
          </Select>
        </div>
      </div>

      <div id="map" style={styles.mapContainer} />
      {modalImageUrl && (
        <Modal
          imageUrl={modalImageUrl}
          onClose={() => setModalImageUrl(null)}
        />
      )}
    </div>
  );
};

export default MapView;
