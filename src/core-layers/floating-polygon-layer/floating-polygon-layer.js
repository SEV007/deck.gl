// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {CompositeLayer, experimental} from '../../core';
const {get} = experimental;
import FloatingSolidPolygonLayer from '../floating-solid-polygon-layer/floating-solid-polygon-layer';
// import PathLayer from '../path-layer/path-layer';
import * as Polygon from '../solid-polygon-layer/polygon';

const defaultLineColor = [0x0, 0x0, 0x0, 0xff];
const defaultFillColor = [0x0, 0x0, 0x0, 0xff];

const defaultProps = {
  filled: true,
  elevationScale: 1,
  wireframe: false,

  lineWidthScale: 1,
  lineWidthMinPixels: 0,
  lineWidthMaxPixels: Number.MAX_SAFE_INTEGER,
  lineJointRounded: false,
  lineMiterLimit: 4,
  lineDashJustified: false,
  fp64: false,

  getPolygon: f => get(f, 'polygon'),
  // Polygon fill color
  getFillColor: f => get(f, 'fillColor') || defaultFillColor,
  // Point, line and polygon outline color
  getLineColor: f => get(f, 'lineColor') || defaultLineColor,
  // Line and polygon outline accessors
  getLineWidth: f => get(f, 'lineWidth') || 1,
  // Polygon start extrusion accessor
  getFloor: f => get(f, 'floor') || 500,
  // Polygon end extrusion accessor
  getCeiling: f => get(f, 'ceiling') || 1000,

  // Optional settings for 'lighting' shader module
  lightSettings: {}
};

export default class PolygonLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      paths: []
    };
  }

  updateState({oldProps, props, changeFlags}) {
    const geometryChanged =
      changeFlags.dataChanged ||
      (changeFlags.updateTriggersChanged &&
        (changeFlags.updateTriggersChanged.all || changeFlags.updateTriggersChanged.getPolygon));

    if (geometryChanged) {
      const {data, getPolygon} = this.props;
      this.state.paths = [];
      data.forEach(object => {
        const complexPolygon = Polygon.normalize(getPolygon(object));
        complexPolygon.forEach(polygon =>
          this.state.paths.push({
            path: polygon,
            object
          })
        );
      });
    }
  }

  getPickingInfo({info}) {
    return Object.assign(info, {
      // override object with picked data
      object: (info.object && info.object.object) || info.object
    });
  }

  /* eslint-disable complexity */
  renderLayers() {
    // Layer composition props
    const {data, stroked, filled, wireframe, elevationScale} = this.props;

    // Rendering props underlying layer
    const {
      lineWidthScale,
      lineWidthMinPixels,
      lineWidthMaxPixels,
      lineJointRounded,
      lineMiterLimit,
      lineDashJustified,
      fp64
    } = this.props;

    // Accessor props for underlying layers
    const {
      getFillColor,
      getLineColor,
      getLineWidth,
      getFloor,
      getCeiling,
      getPolygon,
      updateTriggers,
      lightSettings
    } = this.props;

    const {paths} = this.state;

    const hasData = data && data.length > 0;

    // Filled Polygon Layer
    const polygonLayer =
      filled &&
      hasData &&
      new FloatingSolidPolygonLayer(
        this.getSubLayerProps({
          id: 'fill',
          updateTriggers: {
            getFloor: updateTriggers.getFloor,
            getCeiling: updateTriggers.getCeiling,
            getColor: updateTriggers.getFillColor
          }
        }),
        {
          data,
          elevationScale,

          fp64,
          wireframe: false,

          getPolygon,
          getFloor,
          getCeiling,
          getColor: getFillColor,

          lightSettings
        }
      );

    const polygonWireframeLayer =
      wireframe &&
      hasData &&
      new FloatingSolidPolygonLayer(
        this.getSubLayerProps({
          id: 'wireframe',
          updateTriggers: {
            getFloor: updateTriggers.getFloor,
            getCeiling: updateTriggers.getCeiling,
            getColor: updateTriggers.getLineColor
          }
        }),
        {
          data,

          fp64,
          elevationScale,
          wireframe: true,

          getPolygon,
          getFloor,
          getCeiling,
          getColor: getLineColor
        }
      );

    // Polygon line layer
    // const polygonLineLayer =
    //   !extruded &&
    //   stroked &&
    //   hasData &&
    //   new PathLayer(
    //     this.getSubLayerProps({
    //       id: 'stroke',
    //       updateTriggers: {
    //         getWidth: updateTriggers.getLineWidth,
    //         getColor: updateTriggers.getLineColor,
    //         getDashArray: updateTriggers.getLineDashArray
    //       }
    //     }),
    //     {
    //       data: paths,

    //       fp64,
    //       widthScale: lineWidthScale,
    //       widthMinPixels: lineWidthMinPixels,
    //       widthMaxPixels: lineWidthMaxPixels,
    //       rounded: lineJointRounded,
    //       miterLimit: lineMiterLimit,
    //       dashJustified: lineDashJustified,

    //       getPath: x => x.path,
    //       getColor: x => getLineColor(x.object),
    //       getWidth: x => getLineWidth(x.object),
    //       getDashArray: getLineDashArray && (x => getLineDashArray(x.object))
    //     }
    //   );

    return [
      polygonWireframeLayer,
      // polygonLineLayer,
      polygonLayer
    ];
  }
  /* eslint-enable complexity */
}

PolygonLayer.layerName = 'FloatingPolygonLayer';
PolygonLayer.defaultProps = defaultProps;