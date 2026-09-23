const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock controllers before requiring routes to ensure tests remain isolated from controller/DB logic
jest.mock('../../controllers/messagesController', () => ({
  addMessage: jest.fn((req, res) => res.json({ status: true })),
  getAllMessage: jest.fn((req, res) => res.json({ status: true })),
  uploadMedia: jest.fn((req, res) =>
    res.status(200).json({
      status: true,
      files: req.files?.map((f) => f.originalname) || [],
    })
  ),
  markAsRead: jest.fn((req, res) => res.json({ status: true })),
  reactToMessage: jest.fn((req, res) => res.json({ status: true })),
  editMessage: jest.fn((req, res) => res.json({ status: true })),
  deleteMessage: jest.fn((req, res) => res.json({ status: true })),
  pinMessage: jest.fn((req, res) => res.json({ status: true })),
  starMessage: jest.fn((req, res) => res.json({ status: true })),
  getAISessions: jest.fn((req, res) => res.json({ status: true })),
  deleteAISession: jest.fn((req, res) => res.json({ status: true })),
}));

jest.mock('../../controllers/statusController', () => ({
  createStatus: jest.fn((req, res) =>
    res.status(200).json({
      status: true,
      file: req.file?.originalname || null,
    })
  ),
  getStatuses: jest.fn((req, res) => res.json({ status: true })),
  viewStatus: jest.fn((req, res) => res.json({ status: true })),
  deleteStatus: jest.fn((req, res) => res.json({ status: true })),
}));

const { uploadMedia } = require('../../controllers/messagesController');
const { createStatus } = require('../../controllers/statusController');

const messagesRouter = require('../../routes/messages.Routes');
const statusRouter = require('../../routes/statusRoutes');

describe('Multer Configuration & Route Middleware Integration Tests', () => {
  let messagesApp;
  let statusApp;
  const testSecret = 'multer_routes_integration_test_secret_12345';
  const originalEnvSecret = process.env.JWT_SECRET;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = testSecret;
    validToken = jwt.sign({ id: '507f1f77bcf86cd799439001', username: 'testuser' }, testSecret);

    // Build lightweight isolated Express test apps without importing app.js
    messagesApp = express();
    messagesApp.use(express.json());
    messagesApp.use('/api/messages', messagesRouter);

    statusApp = express();
    statusApp.use(express.json());
    statusApp.use('/api/status', statusRouter);
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalEnvSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. messages.Routes.js /upload
  // ---------------------------------------------------------------------------
  describe('1. messages.Routes.js POST /api/messages/upload', () => {
    test('1a. Valid image upload (small buffer, image/jpeg) passes through to uploadMedia controller', async () => {
      const smallImageBuffer = Buffer.from('fake-jpeg-image-binary-stream');

      const res = await request(messagesApp)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('files', smallImageBuffer, {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        files: ['avatar.jpg'],
      });
      expect(uploadMedia).toHaveBeenCalledTimes(1);
    });

    test('1b. File exceeding 50MB returns HTTP 400 with fixed 50MB error message', async () => {
      // 51MB payload to trigger Multer LIMIT_FILE_SIZE error
      const oversizedBuffer = Buffer.alloc(51 * 1024 * 1024);

      const res = await request(messagesApp)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('files', oversizedBuffer, {
          filename: 'large_recording.mp4',
          contentType: 'video/mp4',
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 400,
        error: 'File size exceeds 50MB limit per file.',
      });
      expect(uploadMedia).not.toHaveBeenCalled();
    });

    test('1c. Uploading more than 10 files in one request returns HTTP 400 LIMIT_FILE_COUNT error', async () => {
      let req = request(messagesApp)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${validToken}`);

      // Attach 11 valid files (exceeding the MAX_FILES_COUNT = 10 limit)
      for (let i = 1; i <= 11; i++) {
        req = req.attach('files', Buffer.from(`file-content-${i}`), {
          filename: `photo_${i}.png`,
          contentType: 'image/png',
        });
      }

      const res = await req;

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 400,
        error: 'Cannot upload more than 10 files at once.',
      });
      expect(uploadMedia).not.toHaveBeenCalled();
    });

    test('1d. Invalid file type (.exe with unallowed mimetype & extension) returns HTTP 400 fileFilter error and does not call controller', async () => {
      const exeBuffer = Buffer.from('MZ-fake-executable-binary');

      const res = await request(messagesApp)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('files', exeBuffer, {
          filename: 'payload.exe',
          contentType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 400,
        error: 'Invalid file type: "payload.exe". Allowed types: Images, Videos, PDF, DOC/DOCX, XLS/XLSX, CSV.',
      });
      expect(uploadMedia).not.toHaveBeenCalled();
    });

    test('1e. Valid unusual allowed type (.csv with text/csv) passes through successfully', async () => {
      const csvBuffer = Buffer.from('id,name,email\n1,Alice,alice@test.com\n2,Bob,bob@test.com');

      const res = await request(messagesApp)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('files', csvBuffer, {
          filename: 'report.csv',
          contentType: 'text/csv',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        files: ['report.csv'],
      });
      expect(uploadMedia).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. statusRoutes.js /create
  // ---------------------------------------------------------------------------
  describe('2. statusRoutes.js POST /api/status/create', () => {
    test('2a. Valid media upload under 30MB passes through to createStatus controller', async () => {
      const storyImageBuffer = Buffer.from('story-photo-content');

      const res = await request(statusApp)
        .post('/api/status/create')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('media', storyImageBuffer, {
          filename: 'story.png',
          contentType: 'image/png',
        })
        .field('caption', 'My new story');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        file: 'story.png',
      });
      expect(createStatus).toHaveBeenCalledTimes(1);
    });

    test('2b. File exceeding 30MB returns HTTP 400 with clean JSON error response', async () => {
      // 31MB payload to trigger 30MB LIMIT_FILE_SIZE error on stories
      const oversizedStoryBuffer = Buffer.alloc(31 * 1024 * 1024);

      const res = await request(statusApp)
        .post('/api/status/create')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('media', oversizedStoryBuffer, {
          filename: 'large_story.mp4',
          contentType: 'video/mp4',
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: false,
        msg: 'File size exceeds 30MB limit for stories',
      });
      expect(createStatus).not.toHaveBeenCalled();
    });

    test('2c. Accepts unlisted/arbitrary mimetype because statusRoutes has no fileFilter', async () => {
      // NOTE: unlike messages.Routes.js, statusRoutes.js has no fileFilter — any file type is accepted for status media, see audit.
      const arbitraryBuffer = Buffer.from('custom-arbitrary-binary-stream');

      const res = await request(statusApp)
        .post('/api/status/create')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('media', arbitraryBuffer, {
          filename: 'file.arbitrary',
          contentType: 'application/x-arbitrary',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        file: 'file.arbitrary',
      });
      expect(createStatus).toHaveBeenCalledTimes(1);
    });
  });
});
