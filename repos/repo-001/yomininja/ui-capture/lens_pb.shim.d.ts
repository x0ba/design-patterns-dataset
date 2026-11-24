// Build shim: the Google Lens .proto sources (grpc/lens_proto) are not in the repo,
// so `npm run grpc-lens-types` cannot generate this file. Types only; not used by the renderer at runtime.
/* eslint-disable */
export declare const lens: any;
export declare namespace lens {
    type LensOverlayServerResponse = any;
    type LensOverlayServerRequest = any;
    type LensOverlayRoutingInfo = any;
    type Platform = any;
    type LensOverlayFilterType = any;
    type WritingDirection = any;
}
