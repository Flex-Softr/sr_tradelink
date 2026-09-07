import { withAuth } from "next-auth/middleware";

const authProxy = withAuth({
  pages: {
    signIn: "/login",
  },
});

export const proxy = authProxy;
export default authProxy;

export const config = {
  matcher: ["/dashboard/:path*"],
};
