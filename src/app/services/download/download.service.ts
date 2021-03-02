import { Injectable } from '@angular/core';
import * as jsPDF from "jspdf";
import 'jspdf-autotable';

@Injectable()
export class DownloadService {

    public monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

    downloadFileAsCSV(data, filename='logs_csv_multiple_apps', headers) {
        let csvData = this.ConvertToCSV(data, headers);
        
        
        let blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);

        let a = document.createElement('a');
        document.body.appendChild(a);
        a.setAttribute('style', 'display: none');
        a.href = url;
        // a.download = `log_${ this.id }_${ fromTime.toISOString() }_${ toTime.toISOString() }.txt`;
        a.download = `${filename}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    }

    ConvertToCSV(objArray, headerList) {
        let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        let str = '';
        let row = '';
        for (let index in headerList) {
            row += headerList[index] + ',';
        }
        row = row.slice(0, -1);
        str += row + '\r\n';
        for (let i = 0; i < array.length; i++) {
            let row_list = []
            for (let index in headerList) {
                let head = headerList[index];
                row_list.push(array[i][head]);
            }
            str += row_list.join(",") + '\r\n';
        }
        return str;
    }

    downloadFileAsPDF(data, filename='alerts_log_pdf.pdf') {
        
        if ( !data.result ) return;
        let headers = Object.keys(data.result[0]);
        var doc = new jsPDF('p', 'pt', '');
        var content = [];

        const username = data.username,
              now = new Date();
        
        const timeStr = now.toLocaleTimeString('en-US');

        const dt = `${this.monthNames[now.getMonth()]} ${now.getDate()} ${timeStr}`;

        data.result.forEach(element => {     
            let row = [];
            for( let i of headers)
            {
                row.push(element[i]);
            }
            content.push(row);
        });

        var base64Img = "data:image/jpeg;base64,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";
    
        // doc.autoTable(headers, content, { startY: 10 });
        doc.autoTable(headers, content, {
            startY: 10,
            margin: { 
                bottom: 60
            },
            styles: {
                fontSize: 8,
            },
            didDrawPage: function (data) {
                // Footer
                var str = "Page " + doc.internal.getNumberOfPages()
        
                // jsPDF 1.4+ uses getWidth, <1.4 uses .width
                var pageSize = doc.internal.pageSize;
                var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.addImage(base64Img, 'JPEG', pageSize.width - 210 - data.settings.margin.right, pageHeight - 43, 210, 30);
                doc.text(`${username} ${dt}`, data.settings.margin.left, pageHeight - 33);
            },
        })
        
        doc.save(filename);
    }
}