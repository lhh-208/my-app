import React, { useEffect, useState } from "react";
import * as exifr from "exifr";

const styles = {
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1, // 确保地图在输入框下面
  },
  fileInputContainer: {
    display: "flex",
    width: "300px",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: "10px",
    left: "10px",
    zIndex: 10, // 确保输入框在地图上面
    backgroundColor: "white",
    padding: "10px",
    borderRadius: "5px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
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
  fileInputHover: {
    borderColor: "#888",
  },
  yearSelector: {
    padding: "3px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "16px",
    cursor: "pointer",
    transition: "border-color 0.3s",
  },
  yearSelectorHover: {
    borderColor: "#888",
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

// 用于将度分秒转换为十进制
const getDecimalFromDMS = (dms, direction) => {
  const degrees = dms[0];
  const minutes = dms[1] / 60;
  const seconds = dms[2] / 3600;
  const decimal = degrees + minutes + seconds;
  return direction === "S" || direction === "W" ? -decimal : decimal;
};

// WGS-84 转 GCJ-02
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

const MapView = () => {
  const [map, setMap] = useState(null);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [images, setImages] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");

  useEffect(() => {
    // 确保高德地图API已加载
    if (window.AMap) {
      // 创建地图实例

      const initialMap = new window.AMap.Map("map", {
        center: [104.1954, 35.8617], // 中国的中心点
        zoom: 5,
        zooms: [3, 18], // 设置地图缩放级别范围
        resizeEnable: true, // 允许调整大小
      });

      setMap(initialMap);

      // 清理函数
      return () => {
        initialMap.destroy();
      };
    }
  }, []);

  const handleFilesChange = (event) => {
    const files = event.target.files;
    const newImages = [];
    let processedFiles = 0;

    // 过滤掉无法正常读取的文件
    const validFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/") && file.size > 0
    );

    // 遍历选择的文件
    validFiles.forEach((file, index) => {
      // 使用 FileReader 读取图片文件
      const reader = new FileReader();

      reader.onload = async (e) => {
        const imageUrl = e.target.result;

        try {
          // 使用 exifr 获取图像的经纬度和拍摄时间
          const allMetaData = await exifr.parse(file);
          const lat = allMetaData.latitude;
          const lon = allMetaData.longitude;
          const dateTimeOriginal = allMetaData.DateTimeOriginal;
          const createDateTime = allMetaData.CreateDate;
          console.log("-----");
          console.log(allMetaData);

          // 如果有经纬度信息，则在地图上添加缩略图
          if (lat && lon) {
            const latDecimal = lat;
            const lonDecimal = lon;
            // 转换为 GCJ-02 坐标
            const { lat: gcjLat, lon: gcjLon } = wgs84ToGcj02(
              latDecimal,
              lonDecimal
            );
            const position = [gcjLon, gcjLat];

            // 获取拍摄年份
            let year = "Unknown";
            if (dateTimeOriginal && typeof dateTimeOriginal === "string") {
              year = dateTimeOriginal.split(" ")[0].split(":")[0];
            }

            // 添加标记
            const marker = new window.AMap.Marker({
              position: position,
              map: map,
            });

            // 添加信息窗体
            const infoWindow = new window.AMap.InfoWindow({
              content: `<img src="${imageUrl}" alt="Image" style="width: 100px; height: auto; cursor: pointer;" />`,
              offset: new window.AMap.Pixel(0, -30),
            });
            marker.on("click", () => {
              infoWindow.open(map, marker.getPosition());
              map.setZoomAndCenter(15, position); // 放大并定位到标记位置
            });

            // 点击图片时打开模态框
            infoWindow.on("open", () => {
              const img = document.querySelector(".amap-info-content img");
              if (img) {
                img.addEventListener("click", () => {
                  setModalImageUrl(imageUrl);
                });
              }
            });

            // 添加到图片数组
            newImages.push({ imageUrl, year, marker, createDateTime });

            // 更新状态
            setImages((prevImages) => {
              const sortedImages = [...prevImages, ...newImages].sort(
                (a, b) =>
                  new Date(a.createDateTime) - new Date(b.createDateTime)
              );
              return sortedImages;
            });

            // 更新年份列表
            const newYears = new Set(newImages.map((img) => img.year));
            setYears((prevYears) =>
              Array.from(new Set([...prevYears, ...newYears]))
            );
          } else {
            console.warn(`文件 ${file.name} 没有包含经纬度信息！`);
          }
        } catch (error) {
          console.error(`处理文件 ${file.name} 时出错:`, error);
        } finally {
          // 处理完成的文件计数
          processedFiles += 1;

          // 如果所有文件都处理完成，定位到最后一个标记的位置
          if (processedFiles === validFiles.length) {
            const lastImage = newImages[newImages.length - 1];
            if (lastImage) {
              setTimeout(() => {
                map.setZoomAndCenter(15, lastImage.marker.getPosition());
              });
            }
          }
        }
      };

      reader.onerror = (error) => {
        console.error(`读取文件 ${file.name} 时出错:`, error);
        // 处理完成的文件计数
        processedFiles += 1;

        // 如果所有文件都处理完成，定位到最后一个标记的位置
        if (processedFiles === validFiles.length) {
          const lastImage = newImages[newImages.length - 1];
          if (lastImage) {
            setTimeout(() => {
              map.setZoomAndCenter(15, lastImage.marker.getPosition());
            });
          }
        }
      };

      reader.readAsDataURL(file);
    });

    // 重置 input 的值，以便可以继续上传
    event.target.value = "";
  };

  const handleYearChange = (event) => {
    const year = event.target.value;
    setSelectedYear(year);

    // 过滤并展示对应年份的图片
    images.forEach((img) => {
      if (year === "All" || img.year === year) {
        img.marker.show();
      } else {
        img.marker.hide();
      }
    });
  };

  return (
    <div>
      <div style={styles.fileInputContainer}>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          style={styles.fileInput}
        />
        <select onChange={handleYearChange} style={styles.yearSelector}>
          <option value="All">全部年份</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
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
