export interface HealthStatus {
  service: string;
  status: "ok";
  uptime: number;
  timestamp: string;
}

class HealthService {
  getStatus(): HealthStatus {
    return {
      service: "usage-event-api",
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
