// Enkel lokal typ så du slipper import från @remix-run/node
export type Route = {
  LoaderArgs: {
    request: Request;
    params?: Record<string, string>;
  };
  ComponentProps: {
    loaderData: any;
    params?: Record<string, string>;
  };
};