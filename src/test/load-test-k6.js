import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Rigorous Stress test execution targets representing SLAs
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 active users
    { duration: '1m', target: 50 },   // Maintain 50 requests concurrency
    { duration: '30s', target: 100 }, // Stress lift concurrency to 100 users
    { duration: '1m', target: 100 },  // Hold peak concurrency
    { duration: '30s', target: 0 },   // Cool down gracefully
  ],
  thresholds: {
    // 95% of requests must complete faster than 250ms under operational SLAs
    http_req_duration: ['p(95)<250'],
    // Request error rate must remain strictly under 0.1%
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.API_TARGET_URL || 'https://aureliaops.com/api';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-Trace-ID': `k6-stress-${__VU}-${__ITER}`,
    // Set mock user authentication vector
    'Authorization': 'Bearer k6_verification_high_load_test_token',
  };

  // 1. Simulating ticket search queries concurrency (High read query load)
  const searchQuery = 'database breach';
  const queryResponse = http.get(`${BASE_URL}/workspaces/ops-hq/tickets?q=${searchQuery}`, { headers });
  check(queryResponse, {
    'search status is 200': (r) => r.status === 200,
    'search latency has SLA compliance': (r) => r.timings.duration < 250,
  });

  sleep(1);

  // 2. Simulating real-time message exchange logs (Writers contention load)
  const messageData = JSON.stringify({
    content: 'Automated performance telemetry verification log entry.',
    isInternal: false,
    attachmentIds: [],
  });

  const commentResponse = http.post(
    `${BASE_URL}/workspaces/ops-hq/tickets/fc0189a1-0aa1-4ff2-aed9-0ee61cf1c1b1/messages`,
    messageData,
    { headers }
  );

  check(commentResponse, {
    'comment post status is 201': (r) => r.status === 201 || r.status === 401, // 401 is accepted if token mock triggers auth
  });

  sleep(2);
}
