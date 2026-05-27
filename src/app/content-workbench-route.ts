export const isContentWorkbenchRoute = (
  locationLike: Pick<Location, "pathname" | "search">
): boolean => {
  const params = new URLSearchParams(locationLike.search);
  const workbench = params.get("workbench");

  return (
    workbench === "content" ||
    locationLike.pathname === "/workbench" ||
    locationLike.pathname === "/workbench/content" ||
    locationLike.pathname === "/content-workbench"
  );
};
