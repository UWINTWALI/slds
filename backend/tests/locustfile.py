# Stress test for the SLDS system.
# Simulates multiple users hitting the system at the same time.
# Run with: locust -f tests/locustfile.py --host=http://localhost:8000

from locust import HttpUser, task, between


class SLDSUser(HttpUser):

    # Each simulated user waits 1 to 3 seconds between requests
    # to simulate realistic officer behaviour
    wait_time = between(1, 3)

    def on_start(self):
        # Each user logs in when they start, just like a real officer would
        response = self.client.post("/api/auth/login", json={
            "email": "admin@gmail.com",
            "password": "admin"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    # This task runs most often because loading the national map
    # is the heaviest operation in the system
    @task(3)
    def load_national_map(self):
        self.client.get(
            "/api/national/geojson",
            headers=self.headers,
            name="GET national map"
        )

    # Dashboard summary is loaded every time a user opens the app
    @task(5)
    def load_national_summary(self):
        self.client.get(
            "/api/national/summary",
            headers=self.headers,
            name="GET national summary"
        )

    # Sector detail is called whenever an officer selects a sector
    @task(4)
    def load_sector_detail(self):
        self.client.get(
            "/api/sectors/Kacyiru",
            headers=self.headers,
            name="GET sector detail"
        )

    # Login is tested separately to measure authentication performance
    @task(1)
    def login_again(self):
        self.client.post("/api/auth/login", json={
            "email": "gasabo@slds.rw",
            "password": "district"
        }, name="POST login")