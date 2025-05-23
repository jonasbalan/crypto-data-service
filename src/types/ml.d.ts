declare module 'ml-regression' {
  export class PolynomialRegression {
    constructor(x: number[], y: number[], degree: number);
    predict(x: number | number[]): number | number[];
    toString(precision?: number): string;
    toLaTeX(precision?: number, options?: any): string;
    score(x: number[], y: number[]): { r2: number, chi2: number, rmsd: number };
  }

  export class SimpleLinearRegression {
    constructor(x: number[], y: number[]);
    predict(x: number | number[]): number | number[];
    computeX(y: number): number;
    toString(precision?: number): string;
    toLaTeX(precision?: number): string;
    score(x: number[], y: number[]): { r2: number, chi2: number, rmsd: number };
    slope: number;
    intercept: number;
  }
}

declare module 'ml-matrix' {
  export class Matrix {
    constructor(rows: number, columns: number, data?: number[][] | number[] | Matrix);
    static from1DArray(rows: number, columns: number, newData: number[]): Matrix;
    static eye(rows: number, columns?: number): Matrix;
    static zeros(rows: number, columns?: number): Matrix;
    static ones(rows: number, columns?: number): Matrix;
    static rand(rows: number, columns?: number): Matrix;
    static random(rows: number, columns?: number, options?: any): Matrix;
    set(rowIndex: number, columnIndex: number, value: number): Matrix;
    get(rowIndex: number, columnIndex: number): number;
    add(value: number | Matrix): Matrix;
    subtract(value: number | Matrix): Matrix;
    multiply(value: number | Matrix): Matrix;
    divide(value: number | Matrix): Matrix;
    dot(vector2: Matrix): Matrix;
    mmul(other: Matrix): Matrix;
    transpose(): Matrix;
    inverse(): Matrix;
    solve(value: Matrix | number[]): Matrix;
    det(): number;
    trace(): number;
    norm(): number;
    getRow(index: number): number[];
    getColumn(index: number): number[];
    setRow(index: number, array: number[] | Matrix): Matrix;
    setColumn(index: number, array: number[] | Matrix): Matrix;
    subMatrix(startRow: number, endRow: number, startColumn: number, endColumn: number): Matrix;
    selection(rowIndices: number[], columnIndices: number[]): Matrix;
    apply(callback: (i: number, j: number) => number): Matrix;
    sum(by?: 'row' | 'column'): Matrix | number;
    mean(by?: 'row' | 'column'): Matrix | number;
    product(by?: 'row' | 'column'): Matrix | number;
    max(by?: 'row' | 'column'): Matrix | number;
    min(by?: 'row' | 'column'): Matrix | number;
    clone(): Matrix;
    toJSON(): { rows: number, columns: number, data: number[][] };
  }
}

declare module '*.avif' {
  const src: string;
  export default src;
}

declare module '*.bmp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  import * as React from 'react';

  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;

  const src: string;
  export default src;
} 