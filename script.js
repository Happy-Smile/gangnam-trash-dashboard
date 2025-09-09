// 강남구 쓰레기통 현황 대시보드 JavaScript

// 지도 초기화
let map;
let trashMarkers = [];
let citizenReportMarkers = [];
let currentLayer = 'trash-cans';
let trashCanData = [];
let citizenReports = [];

// Firebase 사용 여부
let USE_FIREBASE = true;

// Firebase 함수들
async function addCitizenReportToFirebase(reportData) {
    try {
        const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const docRef = await addDoc(collection(window.firebaseDB, 'citizenReports'), {
            ...reportData,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });
        return { id: docRef.id, ...reportData };
    } catch (error) {
        console.error('Firebase 저장 오류:', error);
        throw error;
    }
}

async function getCitizenReportsFromFirebase() {
    try {
        const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const querySnapshot = await getDocs(collection(window.firebaseDB, 'citizenReports'));
        const reports = [];
        querySnapshot.forEach((doc) => {
            reports.push({ id: doc.id, ...doc.data() });
        });
        return reports;
    } catch (error) {
        console.error('Firebase 로드 오류:', error);
        throw error;
    }
}

// 강남구 중심 좌표
const GANGNAM_CENTER = [37.5172, 127.0473];

// API 기본 URL (환경에 따라 자동 설정)
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : '/api';

// 백엔드 없이 작동하는지 확인 (Netlify는 정적 사이트이므로 false)
let USE_BACKEND = false;

// CSV 파일에서 데이터 가져오기 (주소 기반 좌표 변환)
async function fetchTrashBins() {
    try {
        console.log('🔄 CSV 파일 로드 시작...');
        const response = await fetch('./gangnam_trash_bins.csv');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('✅ CSV 파일 로드 완료, 크기:', csvText.length);
        
        trashCanData = [];
        
        // CSV 파싱
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index] ? values[index].trim() : '';
                });
                
                if (row['설치위치'] && row['설치위치'] !== '') {
                    const coordinates = getCoordinatesFromAddress(row['설치위치'], i);
                    trashCanData.push({
                        id: i,
                        name: row['휴지통명'] || '쓰레기통',
                        address: row['설치위치'],
                        lat: coordinates.lat,
                        lng: coordinates.lng,
                        type: row['휴지통종류'] || '일반쓰레기',
                        status: '정상',
                        install_date: row['설치일자'] || '정보 없음',
                        road_name: row['도로명주소'] || '',
                        location: row['설치위치'] || '',
                        point: row['설치지점'] || '',
                        management: row['관리기관명'] || '정보 없음',
                        phone: row['관리기관전화번호'] || '정보 없음'
                    });
                }
            }
        }

        console.log('✅ CSV 쓰레기통 데이터 로드 완료:', trashCanData.length, '개');
        return trashCanData;
    } catch (error) {
        console.error('❌ CSV 파일 로드 오류:', error);
        console.error('❌ 오류 상세:', error.message);
        trashCanData = [];
        showErrorState(`데이터 로드 실패: ${error.message}`);
        return [];
    }
}

// 주소를 좌표로 변환하는 함수 (개선된 분산 알고리즘)
function getCoordinatesFromAddress(address, index) {
    // 강남구 주요 도로 좌표 (더 많은 도로 추가)
    const roadCoordinates = {
        '테헤란로': [37.5047, 127.0399],
        '강남대로': [37.5172, 127.0473],
        '논현로': [37.5115, 127.0215],
        '도곡로': [37.4905, 127.0318],
        '삼성로': [37.5080, 127.0630],
        '선릉로': [37.5043, 127.0490],
        '역삼로': [37.5000, 127.0333],
        '봉은사로': [37.5140, 127.0600],
        '압구정로': [37.5275, 127.0283],
        '신사동': [37.5150, 127.0200],
        '청담동': [37.5190, 127.0470],
        '도곡동': [37.4905, 127.0318],
        '대치동': [37.4947, 127.0630],
        '개포동': [37.4789, 127.0667],
        '일원동': [37.4833, 127.0833],
        '수서동': [37.4833, 127.1000],
        '세곡동': [37.4667, 127.1000],
        '자곡동': [37.4667, 127.0833],
        '율현동': [37.4667, 127.0667],
        '개포1동': [37.4789, 127.0667],
        '개포2동': [37.4789, 127.0667],
        '개포3동': [37.4789, 127.0667],
        '개포4동': [37.4789, 127.0667],
        '논현1동': [37.5115, 127.0215],
        '논현2동': [37.5115, 127.0215],
        '대치1동': [37.4947, 127.0630],
        '대치2동': [37.4947, 127.0630],
        '대치4동': [37.4947, 127.0630],
        '도곡1동': [37.4905, 127.0318],
        '도곡2동': [37.4905, 127.0318],
        '삼성1동': [37.5080, 127.0630],
        '삼성2동': [37.5080, 127.0630],
        '세곡동': [37.4667, 127.1000],
        '수서동': [37.4833, 127.1000],
        '신사동': [37.5150, 127.0200],
        '압구정동': [37.5275, 127.0283],
        '역삼1동': [37.5000, 127.0333],
        '역삼2동': [37.5000, 127.0333],
        '일원1동': [37.4833, 127.0833],
        '일원2동': [37.4833, 127.0833],
        '일원본동': [37.4833, 127.0833],
        '자곡동': [37.4667, 127.0833],
        '청담동': [37.5190, 127.0470],
        '율현동': [37.4667, 127.0667]
    };
    
    // 주소에서 도로명이나 동명 추출
    let baseCoordinates = GANGNAM_CENTER; // 기본값
    
    for (const [roadName, coords] of Object.entries(roadCoordinates)) {
        if (address.includes(roadName)) {
            baseCoordinates = coords;
            break;
        }
    }
    
    // 황금각도 기반 분산 (더 자연스러운 분포)
    const goldenAngle = 2.39996322972865332; // 137.5도 (라디안)
    const angle = (index * goldenAngle) % (2 * Math.PI);
    
    // 인덱스 기반 오프셋 (더 큰 범위)
    const radius = 0.002 + (index % 10) * 0.0005; // 0.002 ~ 0.007도
    const offsetLat = Math.cos(angle) * radius;
    const offsetLng = Math.sin(angle) * radius;
    
    // 추가 랜덤 오프셋 (더 큰 범위)
    const randomLat = (Math.random() - 0.5) * 0.003; // ±0.0015도
    const randomLng = (Math.random() - 0.5) * 0.003; // ±0.0015도
    
    return {
        lat: baseCoordinates[0] + offsetLat + randomLat,
        lng: baseCoordinates[1] + offsetLng + randomLng
    };
}

// 통계 데이터 계산
function calculateStatistics() {
    if (trashCanData.length === 0) {
        return {
            total_trash_cans: 0,
            general_trash_cans: 0,
            recycling_trash_cans: 0,
            field_surveys: 0,
            citizen_reports: 0,
            priority_areas: 0
        };
    }
    
    const generalCount = trashCanData.filter(trash => 
        trash.type.includes('일반') || trash.type.includes('일반쓰레기')
    ).length;
    
    const recyclingCount = trashCanData.filter(trash => 
        trash.type.includes('재활용') || trash.type.includes('재활용쓰레기')
    ).length;
    
    return {
        total_trash_cans: trashCanData.length,
        general_trash_cans: generalCount,
        recycling_trash_cans: recyclingCount,
        field_surveys: 0,
        citizen_reports: 0,
        priority_areas: 0
    };
}

// 행정동별 통계 데이터
let districtStats = [];

// 시민제보 마커 표시 상태
let citizenReportsVisible = true;

// 강남구 행정동별 면적 데이터 (단위: km²)
const districtArea = {
    '역삼1동': 1.2,
    '역삼2동': 1.1,
    '세곡동': 2.8,
    '대치1동': 1.5,
    '대치2동': 1.3,
    '대치4동': 1.0,
    '청담동': 1.8,
    '압구정동': 1.4,
    '논현1동': 1.6,
    '논현2동': 1.2,
    '도곡1동': 1.1,
    '도곡2동': 0.9,
    '삼성1동': 1.3,
    '삼성2동': 1.2,
    '신사동': 1.7,
    '개포1동': 2.1,
    '개포2동': 1.9,
    '개포4동': 1.6,
    '일원1동': 1.8,
    '일원본동': 1.4,
    '수서동': 2.0
};

// 행정동별 통계 생성 (인구밀도 고려)
function generateDistrictStats() {
    const districtCount = {};
    
    // CSV 데이터에서 행정동별 쓰레기통 개수 계산
    trashCanData.forEach(item => {
        if (item.location) { // 설치위치 필드 사용
            const location = item.location;
            
            // 강남구 주요 행정동 매핑 (더 정확한 매핑)
            const districts = {
                '역삼1': '역삼1동',
                '역삼2': '역삼2동',
                '세곡': '세곡동', 
                '대치1': '대치1동',
                '대치2': '대치2동',
                '대치4': '대치4동',
                '청담': '청담동',
                '압구정': '압구정동',
                '논현1': '논현1동',
                '논현2': '논현2동',
                '도곡1': '도곡1동',
                '도곡2': '도곡2동',
                '삼성1': '삼성1동',
                '삼성2': '삼성2동',
                '신사': '신사동',
                '개포1': '개포1동',
                '개포2': '개포2동',
                '개포4': '개포4동',
                '일원1': '일원1동',
                '일원본': '일원본동',
                '수서': '수서동'
            };
            
            // 설치위치에서 행정동 추출
            for (const [key, district] of Object.entries(districts)) {
                if (location.includes(key)) {
                    districtCount[district] = (districtCount[district] || 0) + 1;
                    break;
                }
            }
        }
    });
    
    // 배열로 변환하고 면적당 쓰레기통 개수 계산
    districtStats = Object.entries(districtCount)
        .map(([district, count]) => {
            const area = districtArea[district] || 1.0; // 기본값 1km²
            const density = (count / area).toFixed(2); // km²당 쓰레기통 개수
            return { 
                district, 
                count, 
                area,
                density: parseFloat(density)
            };
        })
        .sort((a, b) => b.density - a.density); // 면적당 밀도 내림차순 정렬
    
    console.log('📊 행정동별 통계 생성 (면적당 밀도 고려):', districtStats);
    return districtStats;
}

// 현재 위치 가져오기 함수
function getCurrentPosition() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.log('📍 Geolocation이 지원되지 않습니다');
            resolve(null);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log('📍 현재 위치 획득:', { lat, lng });
                resolve({ lat, lng });
            },
            (error) => {
                console.log('📍 위치 접근 실패:', error.message);
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5분 캐시
            }
        );
    });
}

// 지도 초기화 함수
async function initMap() {
    // 현재 위치를 가져와서 지도 초기화
    let initialLocation = GANGNAM_CENTER; // 기본값
    let initialZoom = 13;
    
    try {
        // 현재 위치 가져오기
        const position = await getCurrentPosition();
        if (position) {
            initialLocation = [position.lat, position.lng];
            initialZoom = 15; // 현재 위치일 때는 더 가깝게
            console.log('📍 현재 위치로 지도 초기화:', initialLocation);
        } else {
            console.log('📍 현재 위치를 가져올 수 없어 기본 위치 사용:', GANGNAM_CENTER);
        }
    } catch (error) {
        console.log('📍 위치 접근 권한이 없어 기본 위치 사용:', GANGNAM_CENTER);
    }
    
    map = L.map('map').setView(initialLocation, initialZoom);
    
    // OpenStreetMap 타일 레이어 추가
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Leaflet | © OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // 데이터 로드 및 마커 추가
    await loadDataAndUpdateMap();
}

// 데이터 로드 및 지도 업데이트
async function loadDataAndUpdateMap() {
    // 로딩 상태 표시
    showLoadingState();
    
    try {
        // CSV 데이터 로드
        await fetchTrashBins();
        
        // 시민제보 데이터 로드
        await loadCitizenReports();
        
        // 마커 추가
        addTrashCanMarkers();
        
    // 시민제보 마커 추가
    addAllCitizenReportMarkers();
    
    // 시민제보 카운트 업데이트
    updateCitizenReportCount();
        
        // 통계 계산 및 업데이트
        const statsData = calculateStatistics();
        updateStatistics(statsData);
        
        // 행정동별 통계 생성
        generateDistrictStats();
        
        // 로딩 상태 제거
        hideLoadingState();
        
    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        hideLoadingState();
        showErrorState('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 서버에서 시민제보 데이터 로드
async function loadCitizenReports() {
    try {
        console.log('🔄 시민제보 데이터 로드 시작...');
        
        // Firebase 연결 시도
        if (USE_FIREBASE && window.firebaseDB) {
            try {
                console.log('🔥 Firebase에서 데이터 로드 시도...');
                const firebaseReports = await getCitizenReportsFromFirebase();
                console.log('✅ Firebase 시민제보 데이터 로드 완료:', firebaseReports.length, '개');
                
                // Firebase 데이터가 더 많으면 Firebase 데이터 사용
                if (firebaseReports.length > citizenReports.length) {
                    citizenReports = firebaseReports;
                    // 로컬 스토리지에도 저장
                    localStorage.setItem('citizenReports', JSON.stringify(firebaseReports));
                    console.log('💾 Firebase 데이터를 로컬 스토리지에 백업 저장');
                }
                USE_BACKEND = true;
                return;
            } catch (firebaseError) {
                console.warn('⚠️ Firebase 로드 실패, 로컬 데이터 사용:', firebaseError);
            }
        }
        
        // Firebase 연결 실패 시 로컬 스토리지에서 로드
        console.log('⚠️ Firebase 연결 실패, 로컬 데이터 사용');
        const localData = localStorage.getItem('citizenReports');
        if (localData) {
            citizenReports = JSON.parse(localData);
            console.log('✅ 로컬 시민제보 데이터 로드:', citizenReports.length, '개');
        } else {
            citizenReports = [];
        }
        USE_BACKEND = false;
        
    } catch (error) {
        console.error('❌ 시민제보 데이터 로드 오류:', error);
        // 오류 발생 시 로컬 스토리지에서 로드 시도
        const localData = localStorage.getItem('citizenReports');
        if (localData) {
            citizenReports = JSON.parse(localData);
            console.log('🆘 오류 복구: 로컬 데이터 사용:', citizenReports.length, '개');
        } else {
            citizenReports = [];
        }
        USE_BACKEND = false;
    }
}

// 모든 시민제보 마커 추가
function addAllCitizenReportMarkers() {
    console.log('🔄 시민제보 마커 추가 시작...');
    console.log('📊 현재 시민제보 데이터:', citizenReports);
    
    // 기존 시민제보 마커 제거
    citizenReportMarkers.forEach(marker => map.removeLayer(marker));
    citizenReportMarkers = [];
    
    if (citizenReports.length === 0) {
        console.log('⚠️ 표시할 시민제보 데이터가 없습니다.');
        return;
    }
    
    citizenReports.forEach((report, index) => {
        console.log(`📍 마커 ${index + 1} 추가 중:`, report);
        addCitizenReportMarker(report);
    });
    console.log(`🗺️ 지도에 ${citizenReports.length}개의 시민제보 마커가 추가되었습니다.`);
    console.log('📌 현재 citizenReportMarkers 배열:', citizenReportMarkers);
    
    // 시민제보가 있으면 해당 위치로 지도 이동
    if (citizenReports.length > 0) {
        const lastReport = citizenReports[citizenReports.length - 1];
        map.setView([lastReport.coordinates.lat, lastReport.coordinates.lng], 15);
        console.log('📍 지도를 최신 시민제보 위치로 이동:', lastReport.coordinates);
    }
}

// 쓰레기통 마커 추가 함수
function addTrashCanMarkers() {
    // 기존 마커 제거
    trashMarkers.forEach(marker => map.removeLayer(marker));
    trashMarkers = [];
    
    if (trashCanData.length === 0) {
        console.log('⚠️ 표시할 쓰레기통 데이터가 없습니다.');
        return;
    }
    
    // 쓰레기통 타입별 아이콘 생성
    const getTrashIcon = (type) => {
        let iconClass, iconColor;
        
        if (type.includes('재활용')) {
            iconClass = 'fa-recycle';
            iconColor = '#007bff';
        } else if (type.includes('일반')) {
            iconClass = 'fa-trash-alt';
            iconColor = '#28a745';
        } else {
            iconClass = 'fa-trash-alt';
            iconColor = '#6c757d';
        }
        
        return L.divIcon({
            className: 'trash-icon',
            html: `<i class="fas ${iconClass}" style="color: ${iconColor}"></i>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    };
    
    // 각 쓰레기통에 마커 추가
    trashCanData.forEach(trash => {
        const marker = L.marker([trash.lat, trash.lng], { 
            icon: getTrashIcon(trash.type) 
        }).bindPopup(`
            <div class="popup-content">
                <h3>${trash.name}</h3>
                <p><strong>타입:</strong> ${trash.type}</p>
                <p><strong>주소:</strong> ${trash.address}</p>
                <p><strong>세부위치:</strong> ${trash.location || '정보 없음'}</p>
                <p><strong>관리기관:</strong> ${trash.management || '정보 없음'}</p>
                <p><strong>전화번호:</strong> ${trash.phone || '정보 없음'}</p>
                <p><strong>상태:</strong> ${trash.status}</p>
                <p><strong>데이터 기준일:</strong> ${trash.install_date}</p>
            </div>
        `);
        
        marker.addTo(map);
        trashMarkers.push(marker);
    });
    
    console.log(`🗺️ 지도에 ${trashMarkers.length}개의 마커가 추가되었습니다.`);
}

// 통계 업데이트 함수
function updateStatistics(statsData = null) {
    if (statsData) {
        // API에서 받은 통계 데이터 사용
        const totalTrashElement = document.getElementById('total-trash-cans');
        totalTrashElement.innerHTML = `<span>${statsData.total_trash_cans}</span>`;
        
        // 다른 통계도 업데이트 (필요시)
        console.log('📊 통계 업데이트 완료:', statsData);
    } else {
        // 로컬 데이터로 통계 업데이트
        const totalTrashCans = trashCanData.length;
        const totalTrashElement = document.getElementById('total-trash-cans');
        totalTrashElement.innerHTML = `<span>${totalTrashCans}</span>`;
    }
}

// 로딩 상태 표시
function showLoadingState() {
    const totalTrashElement = document.getElementById('total-trash-cans');
    totalTrashElement.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>데이터 로딩 중...</span>
    `;
}

// 로딩 상태 제거
function hideLoadingState() {
    // 로딩 상태는 updateStatistics에서 처리됨
}

// 오류 상태 표시
function showErrorState(message) {
    const totalTrashElement = document.getElementById('total-trash-cans');
    totalTrashElement.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
        <span>오류</span>
    `;
    console.error('❌', message);
}

// 지도 컨트롤 버튼 이벤트
function setupMapControls() {
    const buttons = {
        'trash-cans-btn': 'trash-cans',
        'field-survey-btn': 'field-survey',
        'api-data-btn': 'api-data'
    };
    
    Object.entries(buttons).forEach(([buttonId, layerType]) => {
        const button = document.getElementById(buttonId);
        button.addEventListener('click', () => {
            // 모든 버튼에서 active 클래스 제거
            document.querySelectorAll('.control-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 클릭된 버튼에 active 클래스 추가
            button.classList.add('active');
            
            // 레이어 변경
            currentLayer = layerType;
            switchLayer(layerType);
        });
    });
    
    // 시민제보 버튼은 setupCitizenReport에서 처리됨
}

// 레이어 전환 함수
function switchLayer(layerType) {
    // 모든 마커 제거
    trashMarkers.forEach(marker => map.removeLayer(marker));
    citizenReportMarkers.forEach(marker => map.removeLayer(marker));
    
    switch(layerType) {
        case 'trash-cans':
            addTrashCanMarkers();
            break;
        case 'field-survey':
            // 현장조사 데이터 표시 (구현 예정)
            console.log('현장조사 레이어 활성화');
            break;
        case 'citizen-report':
            // 시민제보 데이터 표시
            showCitizenReports();
            break;
        case 'api-data':
            // API 데이터 표시 (구현 예정)
            console.log('API 데이터 레이어 활성화');
            break;
    }
}

// 시민제보 마커들 표시
function showCitizenReports() {
    citizenReportMarkers.forEach(marker => {
        marker.addTo(map);
    });
    console.log(`시민제보 ${citizenReportMarkers.length}개 표시`);
}

// 시민제보 기능
function setupCitizenReport() {
    const modal = document.getElementById('citizen-report-modal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.querySelector('.btn-cancel');
    const photoUploadArea = document.getElementById('photo-upload-area');
    const photoUploadCamera = document.getElementById('photo-upload-camera');
    const photoUploadGallery = document.getElementById('photo-upload-gallery');
    const cameraBtn = document.getElementById('camera-btn');
    const galleryBtn = document.getElementById('gallery-btn');
    const form = document.getElementById('citizen-report-form');

    // 모달 닫기
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        form.reset();
        resetPhotoUpload();
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // 카메라 버튼 클릭
    cameraBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoUploadCamera.click();
    });
    
    // 갤러리 버튼 클릭
    galleryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoUploadGallery.click();
    });
    
    // 상단 시민제보 버튼 (새 제보 입력)
    document.getElementById('new-citizen-report-btn').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
    
    // 가운데 시민제보 버튼 (기존 제보 위치 표시)
    document.getElementById('show-citizen-reports-btn').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleCitizenReports();
    });

    // 업로드 버튼 클릭
    const uploadBtn = document.querySelector('.upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            photoUpload.click();
        });
    }

    // 사진 선택 시 (카메라와 갤러리 모두)
    photoUploadCamera.addEventListener('change', handlePhotoUpload);
    photoUploadGallery.addEventListener('change', handlePhotoUpload);

    // 사진 제거 버튼
    document.getElementById('remove-photo').addEventListener('click', resetPhotoUpload);

    // 사진 변경 버튼
    const changePhotoBtn = document.getElementById('change-photo');
    if (changePhotoBtn) {
        changePhotoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 기본적으로 갤러리 선택으로 변경
            photoUploadGallery.click();
        });
    }

    // 폼 제출
    form.addEventListener('submit', handleFormSubmit);
    
    console.log('✅ 시민제보 모달 설정 완료');
}

// 사진 업로드 처리
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기가 너무 큽니다. 5MB 이하의 이미지를 선택해주세요.');
        return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('photo-preview');
        const previewImage = document.getElementById('preview-image');
        const placeholder = document.querySelector('.upload-placeholder');
        const locationInfo = document.getElementById('photo-location');

        previewImage.src = e.target.result;
        placeholder.style.display = 'none';
        preview.style.display = 'block';
        locationInfo.textContent = '위치: 확인 중...';

        // EXIF 데이터에서 좌표 추출
        EXIF.getData(file, function() {
            const lat = EXIF.getTag(this, 'GPSLatitude');
            const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
            const lng = EXIF.getTag(this, 'GPSLongitude');
            const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');

            if (lat && lng) {
                const latitude = convertDMSToDD(lat, latRef);
                const longitude = convertDMSToDD(lng, lngRef);
                
                locationInfo.textContent = `위치: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                locationInfo.style.color = '#28a745';
                
                // 파일에 좌표 정보 저장
                file.coordinates = { lat: latitude, lng: longitude };
                
                console.log('✅ GPS 좌표 추출 성공:', { lat: latitude, lng: longitude });
            } else {
                locationInfo.textContent = '위치: GPS 정보 없음 (현재 지도 중심 좌표 사용)';
                locationInfo.style.color = '#ffc107';
                file.coordinates = null;
                
                console.log('⚠️ GPS 정보 없음 - 지도 중심 좌표 사용 예정');
            }
        });
    };
    reader.readAsDataURL(file);
}

// DMS를 DD로 변환
function convertDMSToDD(dms, ref) {
    let dd = dms[0] + dms[1]/60 + dms[2]/(60*60);
    if (ref === 'S' || ref === 'W') {
        dd = dd * -1;
    }
    return dd;
}

// 사진 업로드 초기화
function resetPhotoUpload() {
    const preview = document.getElementById('photo-preview');
    const placeholder = document.querySelector('.upload-placeholder');
    const photoUploadCamera = document.getElementById('photo-upload-camera');
    const photoUploadGallery = document.getElementById('photo-upload-gallery');
    
    preview.style.display = 'none';
    placeholder.style.display = 'block';
    photoUploadCamera.value = '';
    photoUploadGallery.value = '';
}

// 폼 제출 처리
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const title = document.getElementById('report-title').value;
    const description = document.getElementById('report-description').value;
    const type = document.getElementById('report-type').value;
    const photoFile = document.getElementById('photo-upload-camera').files[0] || 
                     document.getElementById('photo-upload-gallery').files[0];
    
    // 사진에서 좌표 추출
    let coordinates = null;
    if (photoFile && photoFile.coordinates) {
        coordinates = photoFile.coordinates;
    } else {
        // 좌표가 없으면 현재 지도 중심 좌표 사용
        coordinates = map.getCenter();
    }
    
    // 시민제보 데이터 생성
    const reportData = {
        title: title,
        description: description,
        type: type,
        coordinates: coordinates,
        photo: photoFile ? URL.createObjectURL(photoFile) : null
    };
    
           try {
               let report;
               
               if (USE_FIREBASE && window.firebaseDB) {
                   // Firebase에 저장
                   report = await addCitizenReportToFirebase(reportData);
                   console.log('✅ Firebase 시민제보 저장 완료:', report);
                   
                   // Firebase 저장 후 로컬 스토리지에도 백업 저장
                   citizenReports.push(report);
                   localStorage.setItem('citizenReports', JSON.stringify(citizenReports));
                   console.log('💾 Firebase 데이터를 로컬 스토리지에 백업 저장');
               } else {
                   // 로컬 스토리지에 저장 (Firebase 사용 불가시)
                   report = {
                       id: Date.now(),
                       title: reportData.title,
                       description: reportData.description,
                       type: reportData.type,
                       coordinates: reportData.coordinates,
                       timestamp: new Date().toISOString(),
                       status: 'pending',
                       photo: reportData.photo
                   };
                   
                   citizenReports.push(report);
                   localStorage.setItem('citizenReports', JSON.stringify(citizenReports));
                   console.log('✅ 로컬 시민제보 저장 완료');
               }
               
               // 지도에 빨간 마커 추가
               addCitizenReportMarker(report);
               
               // 제보 위치로 지도 이동 및 줌
               map.setView([report.coordinates.lat, report.coordinates.lng], 16);
               
               // 팝업 자동 열기 제거됨
               
               // 통계 업데이트
               updateCitizenReportCount();
               
               // 모달 닫기
               document.getElementById('citizen-report-modal').style.display = 'none';
               document.body.style.overflow = 'auto';
               
               // 폼 초기화
               event.target.reset();
               resetPhotoUpload();
               
               // 성공 메시지
               alert('시민제보가 성공적으로 등록되었습니다!\n지도가 해당 위치로 이동했습니다.');
               
               console.log('✅ 시민제보 등록 성공:', report);
               console.log('📍 지도를 제보 위치로 이동:', report.coordinates);
               
           } catch (error) {
               console.error('❌ 시민제보 등록 실패:', error);
               alert('시민제보 등록에 실패했습니다. 다시 시도해주세요.');
           }
}

// 시민제보 마커 추가
function addCitizenReportMarker(report) {
    console.log('📍 시민제보 마커 추가:', report);
    console.log('📍 좌표 확인:', report.coordinates.lat, report.coordinates.lng);
    
    // 좌표 유효성 검사
    if (!report.coordinates.lat || !report.coordinates.lng) {
        console.error('❌ 유효하지 않은 좌표:', report.coordinates);
        return;
    }
    
    // 팝업 없는 간단한 빨간 마커 생성
    const marker = L.marker([report.coordinates.lat, report.coordinates.lng], {
        icon: L.divIcon({
            html: '<div style="width: 18px; height: 18px; background: red; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(255,0,0,0.8);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        })
    });
    
    console.log('📍 마커 생성 완료:', marker);
    
    marker.addTo(map);
    citizenReportMarkers.push(marker);
    
    console.log('✅ 시민제보 마커 추가 완료, 좌표:', report.coordinates);
    console.log('🗺️ 현재 지도 중심:', map.getCenter());
    console.log('🔍 현재 지도 줌:', map.getZoom());
}

// 제보 유형 이름 변환
function getReportTypeName(type) {
    const typeNames = {
        'overflow': '쓰레기통 넘침',
        'damage': '쓰레기통 파손',
        'missing': '쓰레기통 없음',
        'location': '위치 문제',
        'other': '기타'
    };
    return typeNames[type] || type;
}

// 상태 이름 변환
function getStatusName(status) {
    const statusNames = {
        'pending': '대기중',
        'in_progress': '처리중',
        'resolved': '해결완료'
    };
    return statusNames[status] || status;
}

// 통계 페이지 표시
function showStatisticsPage() {
    // 지도 섹션 숨기기
    document.querySelector('.map-section').style.display = 'none';
    
    // 통계 섹션 표시
    const statsSection = document.getElementById('statistics-section');
    statsSection.style.display = 'block';
    
    // 막대그래프 생성
    createBarChart();
    
    // 우선순위 테이블 생성
    createPriorityTable();
}

// 지도 페이지 표시
function showMapPage() {
    // 통계 섹션 숨기기
    document.getElementById('statistics-section').style.display = 'none';
    
    // 지도 섹션 표시
    document.querySelector('.map-section').style.display = 'block';
}

// 막대그래프 생성
function createBarChart() {
    const chartContainer = document.getElementById('bar-chart');
    chartContainer.innerHTML = '';
    
    if (districtStats.length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d;">데이터가 없습니다.</p>';
        return;
    }
    
    // 상위 5개만 표시 (면적당 밀도 기준)
    const topDistricts = districtStats.slice(0, 5);
    const maxDensity = Math.max(...topDistricts.map(d => d.density));
    
    console.log('📊 막대그래프 데이터 (면적당 밀도 고려):', topDistricts);
    console.log('📊 최대 밀도:', maxDensity);
    
    topDistricts.forEach((district, index) => {
        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        
        const percentage = (district.density / maxDensity) * 100;
        console.log(`📊 ${district.district}: ${district.count}개 (면적 ${district.area}km², km²당 ${district.density}개)`);
        
        barItem.innerHTML = `
            <div class="district-name">${district.district}</div>
            <div class="bar-visual">
                <div class="bar-fill" style="width: 0%"></div>
            </div>
            <div class="bar-count">${district.density}개/km²</div>
        `;
        
        chartContainer.appendChild(barItem);
        
        // 애니메이션 효과 - 더 긴 지연시간으로 확실하게 적용
        setTimeout(() => {
            const barFill = barItem.querySelector('.bar-fill');
            barFill.style.width = `${percentage}%`;
            console.log(`🎯 ${district.district} 막대 애니메이션: ${percentage}%`);
        }, index * 300 + 100);
    });
}

// 우선순위 테이블 생성
function createPriorityTable() {
    const tbody = document.getElementById('priority-tbody');
    tbody.innerHTML = '';
    
    if (districtStats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #7f8c8d;">데이터가 없습니다.</td></tr>';
        return;
    }
    
    // 하위 5개 지역을 부족 지역으로 표시 (면적당 밀도 기준)
    const shortageDistricts = districtStats.slice(-5).reverse();
    
    shortageDistricts.forEach((district, index) => {
        const row = document.createElement('tr');
        
        // 부족도 계산 (km²당 쓰레기통 개수 기준)
        let shortageLevel, priorityClass;
        if (district.density < 20) {
            shortageLevel = '높음';
            priorityClass = 'priority-high';
        } else if (district.density < 40) {
            shortageLevel = '보통';
            priorityClass = 'priority-medium';
        } else {
            shortageLevel = '낮음';
            priorityClass = 'priority-low';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${district.district}</td>
            <td>${district.density}개/km²</td>
            <td class="${priorityClass}">${shortageLevel}</td>
            <td class="${priorityClass}">${shortageLevel === '높음' ? '긴급' : shortageLevel === '보통' ? '보통' : '낮음'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 시민제보 개수 업데이트
function updateCitizenReportCount() {
    const citizenReportElement = document.querySelector('.stat-card:nth-child(3) .stat-number');
    if (citizenReportElement) {
        citizenReportElement.textContent = citizenReports.length;
    }
}

// 네비게이션 설정
function setupNavigation() {
    // 네비게이션 버튼 이벤트 리스너
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 모든 링크에서 active 클래스 제거
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            
            // 클릭된 링크에 active 클래스 추가
            this.classList.add('active');
            
            // 페이지 전환
            const linkText = this.textContent.trim();
            if (linkText === '통계') {
                showStatisticsPage();
            } else if (linkText === '지도') {
                showMapPage();
            }
        });
    });
}

// 시민제보 마커 토글
function toggleCitizenReports() {
    citizenReportsVisible = !citizenReportsVisible;
    
    if (citizenReportsVisible) {
        // 시민제보 마커 표시
        addAllCitizenReportMarkers();
        document.getElementById('show-citizen-reports-btn').innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ▲ 시민제보
        `;
        console.log('✅ 시민제보 마커 표시');
    } else {
        // 시민제보 마커 숨기기
        citizenReportMarkers.forEach(marker => map.removeLayer(marker));
        citizenReportMarkers = [];
        document.getElementById('show-citizen-reports-btn').innerHTML = `
            <i class="fas fa-eye-slash"></i>
            ▲ 시민제보 숨김
        `;
        console.log('❌ 시민제보 마커 숨김');
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 쓰담쓰담 강남 대시보드 시작!');
    
    try {
        await initMap();
        setupMapControls();
        setupCitizenReport();
        setupNavigation();
        
        // 지도 크기 조정
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
            }
        }, 100);
        
        console.log('✅ 대시보드 초기화 완료!');
    } catch (error) {
        console.error('❌ 대시보드 초기화 실패:', error);
        showErrorState('대시보드 초기화 중 오류가 발생했습니다.');
    }
});

// 창 크기 변경 시 지도 크기 조정
window.addEventListener('resize', function() {
    if (map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
});
