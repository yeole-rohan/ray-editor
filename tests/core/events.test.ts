import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/events';

describe('EventBus', () => {
  it('calls registered handler when event emitted', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test', handler);
    bus.emit('test', { foo: 'bar' });
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('does not call handler after off()', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test', handler);
    bus.off('test', handler);
    bus.emit('test');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns false when handler returns false (cancellation)', () => {
    const bus = new EventBus();
    bus.on('test', () => false);
    const result = bus.emit('test');
    expect(result).toBe(false);
  });

  it('calls multiple handlers for same event', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('test', h1);
    bus.on('test', h2);
    bus.emit('test');
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('does not throw when emitting event with no handlers', () => {
    const bus = new EventBus();
    expect(() => bus.emit('no-listeners')).not.toThrow();
  });

  it('clears all handlers on destroy()', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test', handler);
    bus.destroy();
    bus.emit('test');
    expect(handler).not.toHaveBeenCalled();
  });
});
