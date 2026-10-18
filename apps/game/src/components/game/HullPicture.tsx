import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { pictureFrame, type HullPicture } from "@stl/pack";
import { gibImages, shipArtGeneration, shipImage, subscribeShipArt } from "@/game/pack/ship-art";
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
  gone = false,
}: {
  id: string;
  faction: string;
  pirate?: boolean;
  facing: "left" | "right";
  cols: number;
  rows: number;
  rooms: Room[];
  /** The hull has blown apart. Gib images replace the base. */
  gone?: boolean;
}) {
  const artTick = useSyncExternalStore(subscribeShipArt, shipArtGeneration, () => 0);
  const base = artTick >= 0 ? shipImage(id, "base") : undefined;
  const floor = artTick >= 0 ? shipImage(id, "floor") : undefined;
  const cloak = artTick >= 0 ? shipImage(id, "cloak") : undefined;
  const gibs = gone && artTick >= 0 ? gibImages(id) : [];
  if (base || floor || gibs.length > 0) {
    return (
      <>
        {floor ? (
          <HullBase
            className="hull-floor"
            url={floor.url}
            picture={floor.picture}
            offsetX={floor.offsetX}
            offsetY={floor.offsetY}
            cols={cols}
            rows={rows}
          />
        ) : null}
        {base ? (
          <HullBase
            className="hull-base"
            url={base.url}
            picture={base.picture}
            offsetX={base.offsetX}
            offsetY={base.offsetY}
            cols={cols}
            rows={rows}
          />
        ) : null}
        {cloak ? (
          <HullBase
            className="hull-cloak"
            url={cloak.url}
            picture={cloak.picture}
            offsetX={cloak.offsetX}
            offsetY={cloak.offsetY}
            cols={cols}
            rows={rows}
          />
        ) : null}
        {gibs.length > 0 ? (
          <span className="hull-gibs">
            {gibs.map((gib) => (
              <HullBase
                key={gib.url}
                className="hull-gib"
                url={gib.url}
                picture={gib.picture}
                offsetX={gib.offsetX}
                offsetY={gib.offsetY}
                cols={cols}
                rows={rows}
              />
            ))}
          </span>
        ) : null}
      </>
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
  className,
  url,
  picture,
  offsetX,
  offsetY,
  cols,
  rows,
}: {
  className: string;
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
    // Gibs sit in a zero-size wrapper so a destroyed hull can show them. The pitch lives on the hull.
    const el = img?.closest(".hull");
    if (!(el instanceof HTMLElement)) return;
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
      className={className}
      src={url}
      alt=""
      draggable={false}
      style={box ?? undefined}
    />
  );
}
