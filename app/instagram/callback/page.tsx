"use client";

import { useEffect } from "react";
import API from "@/service/api";

export default function InstagramCallbackPage() {
  useEffect(() => {
    const sendCode = async () => {
      try {
        const query = new URLSearchParams(window.location.search);

        const code = query.get("code");

        if (!code) {
          window.close();

          return;
        }

        // SEND CODE TO BACKEND
        await API.post("/instagram/auth", {
          code,
        });

        // SEND MESSAGE TO PARENT WINDOW
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "INSTAGRAM_LOGIN_SUCCESS",
            },
            window.location.origin,
          );
        }

        // CLOSE POPUP
        window.close();
      } catch (error) {
        console.error(error);

        window.close();
      }
    };

    sendCode();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg font-semibold">Connecting Instagram...</p>
    </div>
  );
}
