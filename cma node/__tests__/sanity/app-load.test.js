const app = require('../../app');

describe('App Side-Effects Sanity Test', () => {
  it('should load app without throwing errors and without binding to a port', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
    expect(app.server).toBeDefined();
    expect(app.server.listening).toBe(false);
  });
});
