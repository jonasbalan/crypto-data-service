declare module 'brain.js' {
  export namespace recurrent {
    export class LSTMTimeStep {
      constructor(options?: any);
      train(data: any, options?: any): Promise<any>;
      run(input: any): any;
      forecast(input: any, count: number): any;
      toJSON(): any;
      fromJSON(json: any): void;
    }
  }
  
  export namespace NeuralNetwork {
    export interface INeuralNetworkOptions {
      iterations?: number;
      errorThresh?: number;
      log?: boolean;
      logPeriod?: number;
      learningRate?: number;
      momentum?: number;
      callback?: Function;
      callbackPeriod?: number;
      timeout?: number;
      hiddenLayers?: number[];
      activation?: string;
    }
  }
} 