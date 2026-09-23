const fs = require('fs');
const path = require('path');
const {
  askAI,
  translateMessage,
  imagineImage,
  transcribeAudio,
  rewriteMessage,
} = require('../../controllers/aiController');

// Helper to construct mock Express response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to construct mock Express request object
const createMockRequest = (body = {}) => ({
  body,
});

describe('aiController Unit Tests', () => {
  let originalFetch;
  let originalEnv;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. askAI
  // =========================================================================
  describe('1. askAI', () => {
    it('1. Happy path: Pollinations text API responds successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => 'Pollinations AI generated response',
      });

      const req = createMockRequest({ prompt: 'Tell me a joke', username: 'Alice' });
      const res = createMockResponse();

      await askAI(req, res);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        text: 'Pollinations AI generated response',
      });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('2. Fallback to Grok/xAI when Pollinations fails', async () => {
      process.env.GROK_API_KEY = 'test-grok-key';

      // 1st call (Pollinations GET) fails, 2nd call (Pollinations POST) fails, 3rd call (Grok POST) succeeds
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Pollinations GET Timeout'))
        .mockRejectedValueOnce(new Error('Pollinations POST Failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Grok xAI generated response' } }],
          }),
        });

      const req = createMockRequest({ prompt: 'Hello Grok' });
      const res = createMockResponse();

      await askAI(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        text: 'Grok xAI generated response',
      });
    });

    it('3. Fallback to local intelligent knowledge engine when all external APIs fail', async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.XAI_API_KEY;

      // Pollinations GET & POST both fail
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const req = createMockRequest({ prompt: 'Give me some tech startup ideas' });
      const res = createMockResponse();

      await askAI(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          text: expect.stringContaining('Startup Ideas'),
        })
      );
    });

    it('4. Handles malformed/empty HTML response body without crashing', async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.XAI_API_KEY;

      // Returns HTML error page or empty string
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '<!DOCTYPE html><html><body>Error 503</body></html>',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '',
        });

      const req = createMockRequest({ prompt: 'Explain quantum computing' });
      const res = createMockResponse();

      await askAI(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          text: expect.stringContaining('Quantum Computing'),
        })
      );
    });

    it('5. Missing prompt returns 400 and does NOT call fetch', async () => {
      global.fetch = jest.fn();

      const req = createMockRequest({ prompt: '   ' });
      const res = createMockResponse();

      await askAI(req, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Prompt is required',
      });
    });

    it('6. Internal error returns 500 status code', async () => {
      // Simulate unexpected crash during handler execution
      const req = createMockRequest({ prompt: 'Hello' });
      const res = createMockResponse();
      // Cause res.json to throw unexpectedly on first call to trigger outer catch
      res.json.mockImplementationOnce(() => {
        throw new Error('Unexpected serialize failure');
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => 'Ok',
      });

      await askAI(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Failed to process AI query',
      });
    });

    it('7. Timeout via AbortController triggers fallback correctly', async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.XAI_API_KEY;

      const abortError = new DOMException('The operation was aborted', 'AbortError');
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError);

      const req = createMockRequest({ prompt: 'Give me some tech startup ideas' });
      const res = createMockResponse();

      await askAI(req, res);

      // Verify that AbortSignal is passed in the fetch options object
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );

      // Verify that the fallback chain executed successfully on AbortError
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          text: expect.stringContaining('Startup Ideas'),
        })
      );
    });
  });

  // =========================================================================
  // 2. translateMessage
  // =========================================================================
  describe('2. translateMessage', () => {
    it('1. Happy path: MyMemory API translates successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responseData: { translatedText: 'Bonjour le monde' },
        }),
      });

      const req = createMockRequest({ text: 'Hello world', targetLanguage: 'fr' });
      const res = createMockResponse();

      await translateMessage(req, res);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        translatedText: 'Bonjour le monde',
        targetLanguage: 'fr',
        targetLangName: 'French',
        source: 'mymemory',
      });
    });

    it('2. Fallback to Grok/xAI when MyMemory fails', async () => {
      process.env.GROK_API_KEY = 'test-grok-key';

      // MyMemory calls fail for all language pairs
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('MyMemory error 1'))
        .mockRejectedValueOnce(new Error('MyMemory error 2'))
        .mockRejectedValueOnce(new Error('MyMemory error 3'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Hola mundo' } }],
          }),
        });

      const req = createMockRequest({ text: 'Hello world', targetLanguage: 'es' });
      const res = createMockResponse();

      await translateMessage(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        translatedText: 'Hola mundo',
        targetLanguage: 'es',
        targetLangName: 'Spanish',
        source: 'grok',
      });
    });

    it('3. Fallback to local default when all translation APIs fail', async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.XAI_API_KEY;

      // All MyMemory and Pollinations calls reject
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const req = createMockRequest({ text: 'Hello world', targetLanguage: 'de' });
      const res = createMockResponse();

      await translateMessage(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        translatedText: 'Hello world',
        targetLanguage: 'de',
        targetLangName: 'German',
        source: 'local_fallback',
      });
    });

    it('4. Handles malformed response from translation API gracefully', async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.XAI_API_KEY;

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responseData: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responseData: { translatedText: 'MYMEMORY WARNING: QUOTA EXCEEDED' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '<!DOCTYPE html><html>Rate limited</html>',
        });

      const req = createMockRequest({ text: 'Namaste', targetLanguage: 'en' });
      const res = createMockResponse();

      await translateMessage(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        translatedText: 'Namaste',
        targetLanguage: 'en',
        targetLangName: 'English',
        source: 'local_fallback',
      });
    });

    it('5. Missing text returns 400 and does NOT call fetch', async () => {
      global.fetch = jest.fn();

      const req = createMockRequest({ text: '', targetLanguage: 'es' });
      const res = createMockResponse();

      await translateMessage(req, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Text is required for translation',
      });
    });
  });

  // =========================================================================
  // 3. imagineImage
  // =========================================================================
  describe('3. imagineImage', () => {
    let writeFileSyncSpy;

    beforeEach(() => {
      writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    });

    afterEach(() => {
      writeFileSyncSpy.mockRestore();
    });

    it('1. Happy path: Pollinations image buffer downloaded and saved locally', async () => {
      const mockImageBuffer = new Uint8Array(2500).fill(1).buffer;
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockImageBuffer,
      });

      const req = createMockRequest({ prompt: '/imagine futuristic neon city' });
      const res = createMockResponse();

      await imagineImage(req, res);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(writeFileSyncSpy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          imageUrl: expect.stringMatching(/^uploads\/ai-gen-/),
          prompt: 'futuristic neon city',
        })
      );
    });

    it('2. Fallback to direct Pollinations URL when image download times out or fails', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Image fetch timeout'));

      const req = createMockRequest({ prompt: 'cyberpunk cat' });
      const res = createMockResponse();

      await imagineImage(req, res);

      expect(writeFileSyncSpy).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          imageUrl: expect.stringContaining('https://image.pollinations.ai/prompt/'),
          prompt: 'cyberpunk cat',
        })
      );
    });

    it('3. Fallback to direct URL when image buffer is too small/empty', async () => {
      const tinyBuffer = new Uint8Array(100).buffer;
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => tinyBuffer,
      });

      const req = createMockRequest({ prompt: 'minimal landscape' });
      const res = createMockResponse();

      await imagineImage(req, res);

      expect(writeFileSyncSpy).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          imageUrl: expect.stringContaining('https://image.pollinations.ai/prompt/'),
          prompt: 'minimal landscape',
        })
      );
    });

    it('4. Handles malformed buffer extraction error without crashing', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => {
          throw new Error('Corrupt stream');
        },
      });

      const req = createMockRequest({ prompt: 'aurora borealis' });
      const res = createMockResponse();

      await imagineImage(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          imageUrl: expect.stringContaining('https://image.pollinations.ai/prompt/'),
          prompt: 'aurora borealis',
        })
      );
    });

    it('5. Missing prompt returns 400 and does NOT call fetch', async () => {
      global.fetch = jest.fn();

      const req = createMockRequest({ prompt: '' });
      const res = createMockResponse();

      await imagineImage(req, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Prompt is required',
      });
    });
  });

  // =========================================================================
  // 4. transcribeAudio
  // =========================================================================
  describe('4. transcribeAudio', () => {
    it('1. Happy path: Returns existing voiceTranscript if already supplied in body', async () => {
      const req = createMockRequest({
        audioUrl: 'uploads/sample.webm',
        voiceTranscript: 'Meeting starts at 10 AM tomorrow',
      });
      const res = createMockResponse();

      await transcribeAudio(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        transcript: 'Meeting starts at 10 AM tomorrow',
      });
    });

    it('2. Fallback: Returns audio detected status when no speech is transcribed', async () => {
      const req = createMockRequest({ audioUrl: 'uploads/voice-123.mp3' });
      const res = createMockResponse();

      await transcribeAudio(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        transcript: 'Voice note audio detected (No speech recognized or silence).',
      });
    });

    it('3. Missing audioUrl and voiceTranscript returns 400', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      await transcribeAudio(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Audio URL is required',
      });
    });

    it('4. Internal error returns 500 status code', async () => {
      const req = createMockRequest({ audioUrl: 'uploads/test.mp3' });
      const res = createMockResponse();
      res.json.mockImplementationOnce(() => {
        throw new Error('Serialize error');
      });

      await transcribeAudio(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Transcription failed',
      });
    });
  });

  // =========================================================================
  // 5. rewriteMessage
  // =========================================================================
  describe('5. rewriteMessage', () => {
    it('1. Happy path: Pollinations rewrite succeeds', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => 'Could you kindly provide an update regarding the deliverables?',
      });

      const req = createMockRequest({
        text: 'Where is the work?',
        tone: 'professional',
      });
      const res = createMockResponse();

      await rewriteMessage(req, res);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        rewrittenText: 'Could you kindly provide an update regarding the deliverables?',
        originalText: 'Where is the work?',
        tone: 'professional',
        source: 'pollinations',
      });
    });

    it('2. Fallback to Grok/xAI when Pollinations fails', async () => {
      process.env.GROK_API_KEY = 'test-grok-key';

      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Pollinations rewrite timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Hey! Any updates on the project? 😄' } }],
          }),
        });

      const req = createMockRequest({
        text: 'Where is the work?',
        tone: 'casual',
      });
      const res = createMockResponse();

      await rewriteMessage(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        rewrittenText: 'Hey! Any updates on the project? 😄',
        originalText: 'Where is the work?',
        tone: 'casual',
        source: 'grok',
      });
    });

    it('3. Fallback to smart local tone generator when all external APIs fail', async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.XAI_API_KEY;

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const req = createMockRequest({
        text: 'Please review the PR',
        tone: 'energetic',
      });
      const res = createMockResponse();

      await rewriteMessage(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        rewrittenText: "Awesome news! 🚀 Please review the PR Let's make it happen! ✨",
        originalText: 'Please review the PR',
        tone: 'energetic',
        source: 'local_fallback',
      });
    });

    it('4. Handles malformed or empty text response gracefully', async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.XAI_API_KEY;

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '   ',
      });

      const req = createMockRequest({
        text: 'Send the report',
        tone: 'polite',
      });
      const res = createMockResponse();

      await rewriteMessage(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        rewrittenText:
          'Hope you are having a wonderful day! Whenever you have a moment: Send the report. Thank you so much!',
        originalText: 'Send the report',
        tone: 'polite',
        source: 'local_fallback',
      });
    });

    it('5. Missing text returns 400 and does NOT call fetch', async () => {
      global.fetch = jest.fn();

      const req = createMockRequest({ text: '', tone: 'professional' });
      const res = createMockResponse();

      await rewriteMessage(req, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Text is required for tone rewriting',
      });
    });
  });
});
