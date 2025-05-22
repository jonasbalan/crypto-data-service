import request from 'supertest';
import express, { Application } from 'express';
import { setupRoutes } from '../index';

describe('Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    setupRoutes(app);
  });

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/v1/prices', () => {
    it('should return prices endpoint message', async () => {
      const response = await request(app).get('/api/v1/prices');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Endpoint de preços' });
    });
  });

  describe('GET /api/v1/volume', () => {
    it('should return volume endpoint message', async () => {
      const response = await request(app).get('/api/v1/volume');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Endpoint de volume' });
    });
  });

  describe('GET /api/v1/orderbook', () => {
    it('should return orderbook endpoint message', async () => {
      const response = await request(app).get('/api/v1/orderbook');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Endpoint de ordem book' });
    });
  });
}); 