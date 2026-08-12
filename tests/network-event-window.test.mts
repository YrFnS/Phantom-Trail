import test from 'node:test';
import assert from 'node:assert/strict';

import { selectRecentTrackingEvents } from '../components/NetworkGraph/network-event-window.mts';

test('small stored batches are visible immediately after the initial empty load', () => {
  assert.deepEqual(selectRecentTrackingEvents([], 50), []);

  const loadedEvents = [
    { id: 'one' },
    { id: 'two' },
    { id: 'three' },
    { id: 'four' },
  ];

  assert.deepEqual(
    selectRecentTrackingEvents(loadedEvents, 50).map(event => event.id),
    ['one', 'two', 'three', 'four']
  );
});

test('the graph keeps only the newest bounded event window', () => {
  const events = Array.from({ length: 60 }, (_, index) => ({ id: index + 1 }));
  const selected = selectRecentTrackingEvents(events, 50);

  assert.equal(selected.length, 50);
  assert.equal(selected[0].id, 11);
  assert.equal(selected.at(-1)?.id, 60);
});
