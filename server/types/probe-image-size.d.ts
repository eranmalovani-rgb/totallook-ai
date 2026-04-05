declare module "probe-image-size" {
  interface ProbeResult {
    width: number;
    height: number;
    type: string;
    mime: string;
    wUnits: string;
    hUnits: string;
    url: string;
  }

  function probe(src: string | NodeJS.ReadableStream, options?: any): Promise<ProbeResult>;
  export default probe;
}
