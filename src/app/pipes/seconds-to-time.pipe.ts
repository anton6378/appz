import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'secondsToTime'
})
export class SecondsToTimePipe implements PipeTransform {

  transform(seconds){

    if (seconds == 0) return 'less than 1 second';

    let times = {
      // year: 31557600,
      // month: 2629746,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };


    let time_string: string = '';
    let plural: string = '';
    for(let key in times){
      if(Math.floor(seconds / times[key]) > 0){
        if(Math.floor(seconds / times[key]) >1 ){
          plural = 's';
        }
        else{
          plural = '';
        }

        time_string += Math.floor(seconds / times[key]).toString() + ' ' + key.toString() + plural + ' ';
        seconds = seconds - times[key] * Math.floor(seconds / times[key]);

      }
    }
    return time_string;
  }
}
