import * as moment from 'moment';

export class DateRange {

  constructor(public start: moment.Moment, public end: moment.Moment) {
  }

  toString() {
    return this.start.toISOString()+"<"+this.end.toISOString();
  }

  daysString() {
    return this.start.format('YYYY-MM-DD')+"<"+this.end.format('YYYY-MM-DD');
  }

}

