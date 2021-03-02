import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'note'
})
export class NotePipe implements PipeTransform {

  transform(value: string, args?: any): any {

    if (!value) return '';

    let lines = value.trim().split(/\n/);

    if (lines.length > 2 && !lines[1]) {
      lines.splice(1, 1);
      lines[0] = '<b>'+lines[0]+'</b>'
    }

    let ul = false;

    lines.forEach((line: string, i) => {

      line = line.trim();
      let li = line.match(/^\*\s*(.*)$/);
      if (li) {
        lines[i] = '<li>'+li[1]+'</li>';
        if (!ul) {
          lines[i] = '<ul>'+lines[i];
          ul = true;
        }
      } else {
        if (ul) {
          lines[i] = '</ul>'+line;
          ul = false;
        }
        lines[i] = lines[i] + '<br>';
      }
    });

    if (ul) {
      lines.push('</ul>');
    }

    return lines.join('');
  }

}
