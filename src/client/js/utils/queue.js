import _ from 'underscore';

/**
 * Very useful file used for queuing various objects,
 * most notably used in the info controller to queue
 * objects to delete
 */
export default class Queue {
  constructor() {
    const self = this;

    self.queue = [];
  }

  reset() {
    this.queue = [];
  }

  add(object) {
    this.queue.push(object);
  }

  getQueue() {
    return this.queue;
  }

  forEachQueue(callback) {
    _.each(this.queue, (object) => {
      callback(object);
    });
  }
}
