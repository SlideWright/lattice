import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Joystick } from './Joystick';

// The Joystick emits a normalized direction/velocity (dx, dy ∈ [-1, 1]) through
// onNudge — once per keyboard arrow press, per-frame while dragging. These lock the
// deterministic keyboard + axis-lock + disabled contract (the rAF pointer loop can't
// lay out under jsdom, so the pointer path is smoke-tested only).
describe('Joystick', () => {
	it('is a labeled, focusable group', () => {
		render(<Joystick label="Move mark" onNudge={() => {}} />);
		const stick = screen.getByRole('application', { name: 'Move mark' });
		expect(stick).toHaveAttribute('tabindex', '0');
	});

	it('arrow keys emit a unit direction through onNudge', () => {
		const onNudge = vi.fn();
		render(<Joystick label="Move mark" onNudge={onNudge} />);
		const stick = screen.getByRole('application', { name: 'Move mark' });
		fireEvent.keyDown(stick, { key: 'ArrowRight' });
		expect(onNudge).toHaveBeenLastCalledWith(1, 0);
		fireEvent.keyDown(stick, { key: 'ArrowLeft' });
		expect(onNudge).toHaveBeenLastCalledWith(-1, 0);
		fireEvent.keyDown(stick, { key: 'ArrowUp' });
		expect(onNudge).toHaveBeenLastCalledWith(0, -1);
		fireEvent.keyDown(stick, { key: 'ArrowDown' });
		expect(onNudge).toHaveBeenLastCalledWith(0, 1);
	});

	it('ignores non-arrow keys', () => {
		const onNudge = vi.fn();
		render(<Joystick label="Move mark" onNudge={onNudge} />);
		fireEvent.keyDown(screen.getByRole('application', { name: 'Move mark' }), { key: 'Enter' });
		expect(onNudge).not.toHaveBeenCalled();
	});

	it('axis="x" zeroes vertical arrows; axis="y" zeroes horizontal', () => {
		const onX = vi.fn();
		const { rerender } = render(<Joystick label="X only" axis="x" onNudge={onX} />);
		const stickX = screen.getByRole('application', { name: 'X only' });
		fireEvent.keyDown(stickX, { key: 'ArrowUp' }); // vertical disallowed
		fireEvent.keyDown(stickX, { key: 'ArrowRight' });
		expect(onX).toHaveBeenCalledTimes(1);
		expect(onX).toHaveBeenLastCalledWith(1, 0);

		const onY = vi.fn();
		rerender(<Joystick label="Y only" axis="y" onNudge={onY} />);
		const stickY = screen.getByRole('application', { name: 'Y only' });
		fireEvent.keyDown(stickY, { key: 'ArrowRight' }); // horizontal disallowed
		fireEvent.keyDown(stickY, { key: 'ArrowDown' });
		expect(onY).toHaveBeenCalledTimes(1);
		expect(onY).toHaveBeenLastCalledWith(0, 1);
	});

	it('disabled: no keyboard emission, not focusable', () => {
		const onNudge = vi.fn();
		render(<Joystick label="Move mark" onNudge={onNudge} disabled />);
		const stick = screen.getByRole('application', { name: 'Move mark' });
		expect(stick).toHaveAttribute('tabindex', '-1');
		fireEvent.keyDown(stick, { key: 'ArrowRight' });
		expect(onNudge).not.toHaveBeenCalled();
	});

	it('pointer interaction does not throw under jsdom (loop is rAF-guarded)', () => {
		const onNudge = vi.fn();
		render(<Joystick label="Move mark" onNudge={onNudge} />);
		const stick = screen.getByRole('application', { name: 'Move mark' });
		expect(() => {
			fireEvent.pointerDown(stick, { clientX: 60, clientY: 30, pointerId: 1 });
			fireEvent.pointerMove(stick, { clientX: 70, clientY: 40, pointerId: 1 });
			fireEvent.pointerUp(stick, { pointerId: 1 });
		}).not.toThrow();
	});
});
