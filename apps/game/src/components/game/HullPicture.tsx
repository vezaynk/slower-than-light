import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { pictureFrame, type HullPicture } from "@stl/pack";
import { baseImage, shipArtGeneration, subscribeShipArt } from "@/game/pack/ship-art";
import { gridPitch } from "./grid-pitch";
import { HullPlate } from "./HullPlate";
import "./hull-plate.css";

type Room = { x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] };

type Box = { left: number; top: number; width: number; height: number };

/**
 * The base png when the archive has one. Otherwise the procedural plate.
 * Archive pixels land on the same pitch the plate uses, so the margin lines up with the rooms.
 */
export function HullSkin({
  id,
  faction,
  pirate,
  facing,
  cols,
  rows,
  rooms,
}: {
  id: string;
  faction: string;
  pirate?: boolean;
  facing: "left" | "right";
  cols: number;
  rows: number;
  rooms: Room[];
}) {
  const artTick = useSyncExternalStore(subscribeShipArt, shipArtGeneration, () => 0);
  const art = artTick >= 0 ? baseImage(id) : undefined;
  if (art) {
    return (
      <HullBase
        url={art.url}
        picture={art.picture}
        offsetX={art.offsetX}
        offsetY={art.offsetY}
        cols={cols}
        rows={rows}
      />
    );
  }
  return (
    <HullPlate
      id={id}
      faction={faction}
      pirate={pirate}
      facing={facing}
      cols={cols}
      rows={rows}
      rooms={rooms}
    />
  );
}

function HullBase({
  url,
  picture,
  offsetX,
  offsetY,
  cols,
  rows,
}: {
  url: string;
  picture: HullPicture;
  offsetX: number;
  offsetY: number;
  cols: number;
  rows: number;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  useLayoutEffect(() => {
    const img = ref.current;
    const el = img?.parentElement;
    if (!el) return;
    const read = () => {
      const pitch = gridPitch(el, cols, rows);
      if (!pitch) {
        setBox(null);
        return;
      }
      const frame = pictureFrame(
        picture,
        { x: offsetX, y: offsetY },
        { x: pitch.pitchX, y: pitch.pitchY },
      );
      setBox({
        left: pitch.padL + frame.left,
        top: pitch.padT + frame.top,
        width: frame.width,
        height: frame.height,
      });
    };
    read();
    const obs = new ResizeObserver(read);
    obs.observe(el);
    return () => obs.disconnect();
  }, [cols, rows, picture, offsetX, offsetY]);

  return (
    <img
      ref={ref}
      className="hull-base"
      src={url}
      alt=""
      draggable={false}
      style={box ?? undefined}
    />
  );
}
