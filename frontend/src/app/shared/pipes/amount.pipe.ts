import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'amount'
})
export class AmountPipe implements PipeTransform {

  transform(value: any, ...args: unknown[]): unknown {
    if (typeof value !== 'number') {
      return '0.00';
    }

    const roundedValue = Number(value.toFixed(2));

    const formattedValue = new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundedValue);

    return formattedValue;
  }
  

}
