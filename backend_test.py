import requests
import sys
import json
from datetime import datetime

class OcciumAPITester:
    def __init__(self, base_url="https://occium-studio.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                details = f"Status: {response.status_code}, Response: {json.dumps(response_data, indent=2)[:200]}..."
            except:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}..."
            
            self.log_test(name, success, details)
            
            if success:
                return True, response_data if 'response_data' in locals() else {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )

    def test_google_auth_url(self):
        """Test Google auth URL generation"""
        return self.run_test(
            "Google Auth URL",
            "GET",
            "api/auth/google/url?redirect_uri=http://localhost:3000",
            200
        )

    def test_ai_ghostwrite(self):
        """Test AI ghostwrite endpoint"""
        payload = {
            "prompt": "Hello",
            "platform": "linkedin",
            "tone": "professional"
        }
        return self.run_test(
            "AI Ghostwrite",
            "POST",
            "api/ai/ghostwrite",
            200,
            data=payload
        )

    def test_create_post_validation(self):
        """Test post creation endpoint (validation)"""
        # Test with minimal valid data
        payload = {
            "user_id": "test_user_123",
            "account_id": "test_account_123",
            "platform": "linkedin",
            "content_type": "text",
            "title": "Test Post",
            "description": "This is a test post",
            "status": "draft"
        }
        return self.run_test(
            "Create Post (Validation)",
            "POST",
            "api/posts/",
            200,  # Expecting success for valid data
            data=payload
        )

    def test_get_posts(self):
        """Test get posts endpoint"""
        return self.run_test(
            "Get Posts",
            "GET",
            "api/posts/test_user_123",
            200
        )

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Occium Backend API Tests")
        print("=" * 50)

        # Test 1: Health Check
        self.test_health_endpoint()

        # Test 2: Auth URL
        self.test_google_auth_url()

        # Test 3: AI Ghostwrite
        self.test_ai_ghostwrite()

        # Test 4: Create Post
        self.test_create_post_validation()

        # Test 5: Get Posts
        self.test_get_posts()

        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = OcciumAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())