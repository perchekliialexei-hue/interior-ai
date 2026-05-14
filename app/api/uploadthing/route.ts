import { createRouteHandler, createUploadthing } from 'uploadthing/next';

const f = createUploadthing();

export const ourFileRouter = {
  roomPhoto: f({ image: { maxFileSize: '8MB', maxFileCount: 3 } })
    .onUploadComplete(async ({ file }) => {
      console.log('Файл загружен:', file.url);
    }),
};

export type OurFileRouter = typeof ourFileRouter;

export const { GET, POST } = createRouteHandler({ router: ourFileRouter });