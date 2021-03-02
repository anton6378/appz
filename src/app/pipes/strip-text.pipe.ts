import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stripText'
})
export class StripTextPipe implements PipeTransform {

  transform(value: string, len: number = 50): any {

    if (value.length <= len) return value;
    return value.slice(0, len)+"...";
  }

}
