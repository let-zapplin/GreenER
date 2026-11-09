import assert from "node:assert/strict";
import { test } from "node:test";
import { isSameMapTarget, type MapCameraTarget } from "../src/lib/mapFocus.ts";

const saoPaulo: MapCameraTarget = {
  longitude: -46.6333,
  latitude: -23.5505,
  zoom: 16,
  pitch: 62,
};

test("serviços no mesmo enquadramento compartilham o destino", () => {
  assert.equal(isSameMapTarget({ ...saoPaulo }, saoPaulo), true);
});

test("pequenas diferenças decimais não exigem outro deslocamento", () => {
  assert.equal(isSameMapTarget({
    ...saoPaulo,
    longitude: saoPaulo.longitude + 0.000001,
    latitude: saoPaulo.latitude - 0.000001,
    zoom: 16.001,
    pitch: 62.01,
  }, saoPaulo), true);
});

test("São Paulo e Tokyo exigem destinos diferentes", () => {
  assert.equal(isSameMapTarget({
    ...saoPaulo, longitude: 139.6917, latitude: 35.6895,
  }, saoPaulo), false);
});

test("mesma localização com zoom afastado exige aproximação", () => {
  assert.equal(isSameMapTarget({ ...saoPaulo, zoom: 2 }, saoPaulo), false);
});

test("mesma localização com outra inclinação exige enquadramento", () => {
  assert.equal(isSameMapTarget({ ...saoPaulo, pitch: 0 }, saoPaulo), false);
});

test("longitudes equivalentes em voltas diferentes representam o mesmo destino", () => {
  assert.equal(isSameMapTarget({
    ...saoPaulo, longitude: saoPaulo.longitude + 360,
  }, saoPaulo), true);
});
