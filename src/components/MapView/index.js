import React, { useEffect, useState } from 'react';
import EXIF from 'exif-js';

const styles = {
    mapContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1, // 确保地图在输入框下面
    },
    fileInput: {
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 10, // 确保输入框在地图上面
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    yearSelector: {
        position: 'absolute',
        top: '10px',
        left: '150px',
        zIndex: 10, // 确保选择器在地图上面
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    modal: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)', // 添加高斯模糊效果
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        width: '800px',
        height: '600px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'red',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        padding: '5px 10px',
        cursor: 'pointer',
    }
};

// 用于将度分秒转换为十进制
const getDecimalFromDMS = (dms, direction) => {
    const degrees = dms[0];
    const minutes = dms[1] / 60;
    const seconds = dms[2] / 3600;
    const decimal = degrees + minutes + seconds;
    return direction === 'S' || direction === 'W' ? -decimal : decimal;
};

const Modal = ({ imageUrl, onClose }) => (
    <div style={styles.modal} onClick={onClose}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={onClose}>关闭</button>
            <img src={imageUrl} alt="Large view" style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </div>
    </div>
);

const MapView = () => {
    const [map, setMap] = useState(null);
    const [modalImageUrl, setModalImageUrl] = useState(null);
    const [images, setImages] = useState([]);
    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState('All');

    useEffect(() => {
        // 确保高德地图API已加载
        if (window.AMap) {
            // 创建地图实例
            const initialMap = new window.AMap.Map('map', {
                center: [104.1954, 35.8617], // 中国的中心点
                zoom: 5
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

        // 遍历选择的文件
        Array.from(files).forEach((file) => {
            if (file.type.startsWith('image/')) { // 确保是图片文件
                // 使用 FileReader 读取图片文件
                const reader = new FileReader();

                reader.onload = (e) => {
                    const imageUrl = e.target.result;

                    try {
                        // 使用 EXIF.js 获取图像的经纬度和拍摄时间
                        EXIF.getData(file, function() {
                            const allMetaData = EXIF.getAllTags(this);
                            const lat = allMetaData.GPSLatitude;
                            const lon = allMetaData.GPSLongitude;
                            const latRef = allMetaData.GPSLatitudeRef;
                            const lonRef = allMetaData.GPSLongitudeRef;
                            const dateTimeOriginal = allMetaData.DateTimeOriginal;

                            // 如果有经纬度信息，则在地图上添加缩略图
                            if (lat && lon && latRef && lonRef) {
                                const latDecimal = getDecimalFromDMS(lat, latRef);
                                const lonDecimal = getDecimalFromDMS(lon, lonRef);
                                const position = [lonDecimal, latDecimal];

                                // 获取拍摄年份
                                const year = dateTimeOriginal ? dateTimeOriginal.split(' ')[0].split(':')[0] : 'Unknown';

                                // 添加标记
                                const marker = new window.AMap.Marker({
                                    position: position,
                                    map: map
                                });

                                // 添加信息窗体
                                const infoWindow = new window.AMap.InfoWindow({
                                    content: `<img src="${imageUrl}" alt="Image" style="width: 100px; height: auto; cursor: pointer;" />`,
                                    offset: new window.AMap.Pixel(0, -30)
                                });
                                marker.on('click', () => {
                                    infoWindow.open(map, marker.getPosition());
                                    map.setZoomAndCenter(15, position); // 放大并定位到标记位置
                                });

                                // 点击图片时打开模态框
                                infoWindow.on('open', () => {
                                    const img = document.querySelector('.amap-info-content img');
                                    if (img) {
                                        img.addEventListener('click', () => {
                                            setModalImageUrl(imageUrl);
                                        });
                                    }
                                });

                                map.setCenter(position);

                                // 添加到图片数组
                                newImages.push({ imageUrl, year, marker });
                            } else {
                                console.warn(`文件 ${file.name} 没有包含经纬度信息！`);
                            }

                            // 更新状态
                            setImages((prevImages) => [...prevImages, ...newImages]);

                            // 更新年份列表
                            const newYears = new Set(newImages.map((img) => img.year));
                            setYears((prevYears) => Array.from(new Set([...prevYears, ...newYears])));
                        });
                    } catch (error) {
                        console.error(`读取文件 ${file.name} 时出错:`, error);
                    }
                };

                reader.readAsDataURL(file);
            }
        });
    };

    const handleYearChange = (event) => {
        const year = event.target.value;
        setSelectedYear(year);

        // 过滤并展示对应年份的图片
        images.forEach((img) => {
            if (year === 'All' || img.year === year) {
                img.marker.show();
            } else {
                img.marker.hide();
            }
        });
    };

    return (
        <div>
            <input type="file" accept="image/*" webkitdirectory="true" onChange={handleFilesChange} style={styles.fileInput} />
            <select onChange={handleYearChange} style={styles.yearSelector}>
                <option value="All">全部年份</option>
                {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
            <div id="map" style={styles.mapContainer} />
            {modalImageUrl && <Modal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />}
        </div>
    );
};

export default MapView;