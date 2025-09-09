from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # CORS 허용

# 강남구 의류수거함 데이터 URL (실제 공공데이터)
CLOTHING_BINS_URL = "https://data.seoul.go.kr/dataList/15127131/fileData.do"

# 샘플 의류수거함 데이터 (실제로는 API에서 가져올 데이터)
sample_clothing_bins = [
    {
        "id": 1,
        "name": "강남구청 앞 의류수거함",
        "address": "서울특별시 강남구 선릉로 668",
        "lat": 37.5172,
        "lng": 127.0473,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-01-15"
    },
    {
        "id": 2,
        "name": "역삼역 2번 출구 의류수거함",
        "address": "서울특별시 강남구 테헤란로 123",
        "lat": 37.5000,
        "lng": 127.0360,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-02-20"
    },
    {
        "id": 3,
        "name": "논현동 주민센터 의류수거함",
        "address": "서울특별시 강남구 논현로 508",
        "lat": 37.5110,
        "lng": 127.0210,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-03-10"
    },
    {
        "id": 4,
        "name": "삼성동 코엑스 의류수거함",
        "address": "서울특별시 강남구 영동대로 513",
        "lat": 37.5120,
        "lng": 127.0590,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-04-05"
    },
    {
        "id": 5,
        "name": "대치동 아파트 단지 의류수거함",
        "address": "서울특별시 강남구 대치동 890-12",
        "lat": 37.4940,
        "lng": 127.0630,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-05-12"
    },
    {
        "id": 6,
        "name": "개포동 주민센터 의류수거함",
        "address": "서울특별시 강남구 개포로 402",
        "lat": 37.4890,
        "lng": 127.0670,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-06-18"
    },
    {
        "id": 7,
        "name": "일원동 보건소 의류수거함",
        "address": "서울특별시 강남구 일원로 114",
        "lat": 37.4920,
        "lng": 127.0840,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-07-22"
    },
    {
        "id": 8,
        "name": "수서동 지하철역 의류수거함",
        "address": "서울특별시 강남구 광평로 280",
        "lat": 37.4870,
        "lng": 127.1010,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-08-30"
    },
    {
        "id": 9,
        "name": "세곡동 주민센터 의류수거함",
        "address": "서울특별시 강남구 헌인로 570",
        "lat": 37.4650,
        "lng": 127.1060,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-09-15"
    },
    {
        "id": 10,
        "name": "도곡동 타워팰리스 의류수거함",
        "address": "서울특별시 강남구 언주로 114길 20",
        "lat": 37.4780,
        "lng": 127.0470,
        "type": "의류수거함",
        "status": "정상",
        "install_date": "2023-10-08"
    }
]

# 일반 쓰레기통 데이터 (추가 샘플 데이터)
sample_trash_cans = [
    {
        "id": 11,
        "name": "강남구청 앞 일반쓰레기통",
        "address": "서울특별시 강남구 선릉로 668",
        "lat": 37.5175,
        "lng": 127.0475,
        "type": "일반쓰레기통",
        "status": "정상",
        "install_date": "2023-01-10"
    },
    {
        "id": 12,
        "name": "역삼역 1번 출구 일반쓰레기통",
        "address": "서울특별시 강남구 테헤란로 125",
        "lat": 37.5005,
        "lng": 127.0365,
        "type": "일반쓰레기통",
        "status": "정상",
        "install_date": "2023-02-15"
    },
    {
        "id": 13,
        "name": "논현동 상가 앞 일반쓰레기통",
        "address": "서울특별시 강남구 논현로 510",
        "lat": 37.5115,
        "lng": 127.0215,
        "type": "일반쓰레기통",
        "status": "정상",
        "install_date": "2023-03-08"
    },
    {
        "id": 14,
        "name": "삼성동 코엑스 일반쓰레기통",
        "address": "서울특별시 강남구 영동대로 515",
        "lat": 37.5125,
        "lng": 127.0595,
        "type": "일반쓰레기통",
        "status": "정상",
        "install_date": "2023-04-03"
    },
    {
        "id": 15,
        "name": "대치동 아파트 단지 일반쓰레기통",
        "address": "서울특별시 강남구 대치동 890-15",
        "lat": 37.4945,
        "lng": 127.0635,
        "type": "일반쓰레기통",
        "status": "정상",
        "install_date": "2023-05-10"
    }
]

# 모든 쓰레기통 데이터 합치기
all_bins = sample_clothing_bins + sample_trash_cans

# 시민제보 데이터 파일
CITIZEN_REPORTS_FILE = 'citizen_reports.json'

def load_citizen_reports():
    """시민제보 데이터를 로드합니다."""
    if os.path.exists(CITIZEN_REPORTS_FILE):
        try:
            with open(CITIZEN_REPORTS_FILE, 'r', encoding='utf-8') as file:
                return json.load(file)
        except:
            return []
    return []

def save_citizen_reports(reports):
    """시민제보 데이터를 저장합니다."""
    try:
        with open(CITIZEN_REPORTS_FILE, 'w', encoding='utf-8') as file:
            json.dump(reports, file, ensure_ascii=False, indent=2)
        return True
    except:
        return False

@app.route('/api/trash-bins', methods=['GET'])
def get_trash_bins():
    """쓰레기통 데이터를 반환하는 API"""
    try:
        # 쿼리 파라미터로 타입 필터링
        bin_type = request.args.get('type', 'all')
        
        if bin_type == 'clothing':
            data = sample_clothing_bins
        elif bin_type == 'general':
            data = sample_trash_cans
        else:
            data = all_bins
        
        return jsonify({
            "success": True,
            "data": data,
            "total_count": len(data),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """통계 데이터를 반환하는 API"""
    try:
        # 시민제보 데이터 로드
        citizen_reports = load_citizen_reports()
        
        stats = {
            "total_trash_cans": len(all_bins),
            "clothing_bins": len(sample_clothing_bins),
            "general_trash_cans": len(sample_trash_cans),
            "field_surveys": 0,  # 추후 구현
            "citizen_reports": len(citizen_reports),
            "priority_areas": 0  # 추후 구현
        }
        
        return jsonify({
            "success": True,
            "data": stats,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/citizen-reports', methods=['GET'])
def get_citizen_reports():
    """시민제보 데이터를 반환합니다."""
    try:
        reports = load_citizen_reports()
        return jsonify({
            'success': True,
            'data': reports,
            'count': len(reports),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/citizen-reports', methods=['POST'])
def create_citizen_report():
    """새로운 시민제보를 생성합니다."""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['title', 'description', 'type', 'coordinates']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'필수 필드가 누락되었습니다: {field}'
                }), 400
        
        # 기존 제보 데이터 로드
        reports = load_citizen_reports()
        
        # 새 제보 생성
        new_report = {
            'id': len(reports) + 1,
            'title': data['title'],
            'description': data['description'],
            'type': data['type'],
            'coordinates': {
                'lat': float(data['coordinates']['lat']),
                'lng': float(data['coordinates']['lng'])
            },
            'timestamp': datetime.now().isoformat(),
            'status': 'pending',  # pending, in_progress, resolved
            'photo': data.get('photo', None)  # 사진 URL (선택사항)
        }
        
        # 제보 추가
        reports.append(new_report)
        
        # 데이터 저장
        if save_citizen_reports(reports):
            return jsonify({
                'success': True,
                'data': new_report,
                'message': '시민제보가 성공적으로 등록되었습니다.',
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': '데이터 저장에 실패했습니다.',
                'timestamp': datetime.now().isoformat()
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인 API"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    })

# Vercel 배포용
app = app

if __name__ == '__main__':
    print("🚀 쓰담쓰담 강남 API 서버 시작!")
    print("📊 API 엔드포인트:")
    print("   - GET /api/trash-bins - 쓰레기통 데이터")
    print("   - GET /api/statistics - 통계 데이터")
    print("   - GET /api/health - 서버 상태")
    print("🌐 서버 주소: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
