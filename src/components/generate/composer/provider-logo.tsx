import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Real brand marks, provided directly (not fetched) for these 5 providers.
 * Everything else falls back to a monogram badge below. */
const REAL_LOGOS: Record<string, { viewBox: string; content: ReactNode; padded?: boolean }> = {
  ByteDance: {
    viewBox: "0 0 24 24",
    content: (
      <>
        <path fill="#00C8D2" d="M14.944 18.587l-1.704-.445V10.01l1.824-.462c1-.254 1.84-.461 1.88-.453.032 0 .056 2.235.056 4.972v4.973l-.176-.008c-.104 0-.952-.207-1.88-.446z" />
        <path fill="#3C8CFF" d="M7 16.542c0-2.736.024-4.98.064-4.98.032-.008.872.2 1.88.454l1.816.461-.016 4.05-.024 4.049-1.632.422c-.896.23-1.736.445-1.856.469L7 21.523v-4.98z" />
        <path fill="#78E6DC" d="M19.24 12.477c0-9.03.008-9.515.144-9.475.072.024.784.207 1.576.406.792.207 1.576.405 1.744.445l.296.08-.016 8.56-.024 8.568-1.624.414c-.888.23-1.728.437-1.856.47l-.24.055v-9.523z" />
        <path fill="#325AB4" d="M1 12.509c0-4.678.024-8.505.064-8.505.032 0 .872.207 1.872.454l1.824.461v7.582c0 4.16-.016 7.574-.032 7.574-.024 0-.872.215-1.88.47L1 21.013v-8.505z" />
      </>
    ),
  },
  "Black Forest Labs": {
    viewBox: "0 0 24 24",
    content: (
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M17.113 10.248H14.56l-2.553-3.616-7.963 11.27h2.558l5.405-7.654h2.552l-5.404 7.653h2.565l5.392-7.653L24 20 19.97 20v-2.091l-2.857-4.044-2.842 4.037V20H0L12.008 3l5.105 7.249z"
      />
    ),
    padded: false,
  },
  xAI: {
    viewBox: "0 0 24 24",
    content: (
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"
      />
    ),
  },
  Google: {
    viewBox: "0 0 32 32",
    content: (
      <>
        <path fill="#00ac47" d="M23.75,16A7.7446,7.7446,0,0,1,8.7177,18.6259L4.2849,22.1721A13.244,13.244,0,0,0,29.25,16" />
        <path fill="#4285f4" d="M23.75,16a7.7387,7.7387,0,0,1-3.2516,6.2987l4.3824,3.5059A13.2042,13.2042,0,0,0,29.25,16" />
        <path fill="#ffba00" d="M8.25,16a7.698,7.698,0,0,1,.4677-2.6259L4.2849,9.8279a13.177,13.177,0,0,0,0,12.3442l4.4328-3.5462A7.698,7.698,0,0,1,8.25,16Z" />
        <path fill="#ea4435" d="M16,8.25a7.699,7.699,0,0,1,4.558,1.4958l4.06-3.7893A13.2152,13.2152,0,0,0,4.2849,9.8279l4.4328,3.5462A7.756,7.756,0,0,1,16,8.25Z" />
        <path fill="#4285f4" d="M29.25,15v1L27,19.5H16.5V14H28.25A1,1,0,0,1,29.25,15Z" />
      </>
    ),
  },
  Alibaba: {
    viewBox: "0 0 24 24",
    content: (
      <path
        fillRule="evenodd"
        fill="#FF6003"
        d="M24 14.014c-2.8 1.512-5.62 2.896-8.759 3.524-.7.139-1.476.139-2.187.043-.678-.085-1.017-.682-.776-1.31.23-.585.536-1.181.93-1.671.852-1.065 1.814-2.034 2.678-3.088a15.75 15.75 0 001.422-2.054c.306-.511.164-1.129-.372-1.384-.897-.437-1.859-.745-2.81-1.075-.11-.043-.274.074-.492.149.273.244.47.425.743.67-2.821.48-5.49 1.16-8.08 2.098-.012.053-.033.095-.023.117.383.585.208 1.032-.35 1.394a2.365 2.365 0 00-.568.522c1.706.5 3.226.213 4.68-.735-.087-.127-.175-.244-.262-.372.546.096.874.394.918.862.011.107-.054.213-.087.32-.077-.086-.175-.17-.24-.267-.045-.064-.056-.138-.088-.245-1.728 1.15-3.587 1.438-5.632.842 0 .404-.022.745.011 1.075.022.287-.098.415-.36.564-.591.362-1.204.735-1.696 1.214-.59.585-.371 1.299.427 1.597.907.34 1.859.35 2.81.234 1.126-.139 2.23-.32 3.456-.49-1.433.67-2.844 1.14-4.33 1.33-1.04.14-2.078.214-3.106-.084-1.476-.415-2.133-1.501-1.75-2.96.361-1.363 1.236-2.449 2.176-3.45 3.139-3.332 7.108-5.024 11.7-5.365 1.072-.074 2.155.064 3.16.511 1.411.639 2.002 1.99 1.313 3.354-.448.905-1.072 1.735-1.695 2.555-.612.809-1.301 1.554-1.946 2.331-.186.234-.361.48-.503.745-.274.5-.088.83.492.778 1.213-.118 2.45-.213 3.62-.511 1.716-.437 3.389-1.054 5.084-1.597.175-.043.339-.107.492-.17z"
      />
    ),
  },
  MiniMax: {
    viewBox: "0 0 48 48",
    content: (
      <>
        <path
          fill="url(#minimax-gradient)"
          d="M32.6 4c2.3 0 4.1 1.9 4.1 4.1v25a1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0 1.5-1.5V18.2a4 4 0 0 1 5.7-3.8 4 4 0 0 1 2.6 3.8v13.1a1.3 1.3 0 0 1-1.8 1.2 1 1 0 0 1-.8-1.2V18.2a1.5 1.5 0 0 0-1.5-1.5 1.5 1.5 0 0 0-1.6 1.5v15a4 4 0 0 1-5.6 3.7A4 4 0 0 1 34 33v-25a2 2 0 0 0-1.5-1.5A1.6 1.6 0 0 0 31 8.1V40a4 4 0 0 1-5.7 3.7 4 4 0 0 1-2.5-3.8v-3.8q.1-1.2 1.3-1.3 1.2.1 1.3 1.3v3.8q0 .9.7 1.3a1.5 1.5 0 0 0 2-.5q.3-.3.3-.8V8.1C28.4 6 30.2 4 32.6 4M21.2 4c2.3 0 4.2 1.9 4.2 4.1v23a1.3 1.3 0 0 1-1.8 1.3 1 1 0 0 1-.8-1.2v-23a1.6 1.6 0 0 0-1.6-1.6A1.6 1.6 0 0 0 19.6 8v28a4 4 0 0 1-4.1 4.2 4 4 0 0 1-4.2-4.1v-18a1.5 1.5 0 0 0-1.5-1.5 1.5 1.5 0 0 0-1.5 1.5v7.6a4 4 0 0 1-5.7 3.8A4 4 0 0 1 0 25.8V23q.1-1.1 1.3-1.2T2.6 23v2.8q.2 1.4 1.5 1.5 1.5-.1 1.6-1.5v-7.6a4 4 0 0 1 4.1-4.1 4 4 0 0 1 4.2 4.1v18q0 1.3 1.5 1.5 1.3-.2 1.5-1.5v-28C17 5.8 19 4 21.2 4"
        />
        <defs>
          <linearGradient id="minimax-gradient" x1="0" x2="48.1" y1="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e2167e" />
            <stop offset="1" stopColor="#fe603c" />
          </linearGradient>
        </defs>
      </>
    ),
  },
  Recraft: {
    viewBox: "0 0 48 48",
    content: (
      <>
        <g clipPath="url(#recraft-clip-a)">
          <mask
            id="recraft-mask"
            width="48"
            height="48"
            x="0"
            y="0"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
          >
            <path fill="#fff" d="M48 0H0v48h48z" />
          </mask>
          <g mask="url(#recraft-mask)">
            <path fill="#fff" d="M40 0H8a8 8 0 0 0-8 8v32a8 8 0 0 0 8 8h32a8 8 0 0 0 8-8V8a8 8 0 0 0-8-8" />
            <g fill="#000" fillRule="evenodd" clipPath="url(#recraft-clip-c)" clipRule="evenodd">
              <path d="M34.9 18.5c0-6.5-6-11.7-13.2-11.7-2.5 0-4.5 5.2-4.5 11.7q0 2.4.3 4.5h-4.4L8.4 39.3h13.3v-9.1C29 30.2 35 24.9 35 18.5M21.7 8.9c1.3 0 2.4 4.3 2.4 9.6s-1 9.5-2.4 9.5-2.4-4.2-2.4-9.5 1.1-9.6 2.4-9.6" />
              <path d="M35.1 30.2H21.7l5.2 9.1h13.3z" />
            </g>
          </g>
        </g>
        <defs>
          <clipPath id="recraft-clip-a">
            <path fill="#fff" d="M0 0h48v48H0z" />
          </clipPath>
          <clipPath id="recraft-clip-c">
            <path fill="#fff" d="M7 6.8h34v34H7z" />
          </clipPath>
        </defs>
      </>
    ),
  },
  OpenAI: {
    viewBox: "0 0 48 48",
    content: (
      <>
        <g clipPath="url(#openai-clip-a)">
          <mask
            id="openai-mask-b"
            width="48"
            height="48"
            x="0"
            y="0"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
          >
            <path fill="#fff" d="M48 0H0v48h48z" />
          </mask>
          <g mask="url(#openai-mask-b)">
            <path fill="#fff" d="M40 0H8a8 8 0 0 0-8 8v32a8 8 0 0 0 8 8h32a8 8 0 0 0 8-8V8a8 8 0 0 0-8-8" />
            <mask
              id="openai-mask-c"
              width="36"
              height="36"
              x="6"
              y="6"
              maskUnits="userSpaceOnUse"
              style={{ maskType: "luminance" }}
            >
              <path fill="#fff" d="M42 6H6v36h36z" />
            </mask>
            <g mask="url(#openai-mask-c)">
              <path
                fill="#000"
                d="M39.4 20.7a9 9 0 0 0-.8-7.3A9 9 0 0 0 29 9a9.1 9.1 0 0 0-15.4 3.3 9 9 0 0 0-6 4.3 9 9 0 0 0 1 10.7 9 9 0 0 0 .9 7.3A9 9 0 0 0 19 39a9 9 0 0 0 6.8 3 9 9 0 0 0 8.6-6.3 9 9 0 0 0 7.2-9.8 9 9 0 0 0-2.3-5.2M26 39.7q-2.5 0-4.3-1.6l.2-.1 7.2-4.2a1 1 0 0 0 .5-1V22.7l3 1.8h.1V33a7 7 0 0 1-6.7 6.7m-14.5-6.2q-1.2-2.1-.8-4.6l.2.2 7.2 4.1a1 1 0 0 0 1.2 0l8.7-5v3.5L20.6 36a6.7 6.7 0 0 1-9.2-2.4M9.5 17.8q1.2-2 3.6-3v8.6a1 1 0 0 0 .5 1l8.8 5-3 1.8a.1.1 0 0 1-.2 0L12 27a7 7 0 0 1-2.5-9.2m25 5.8-8.8-5 3-1.8L36 21A6.7 6.7 0 0 1 35 33v-8.5a1 1 0 0 0-.6-1m3-4.5-.3-.1-7.2-4.2a1 1 0 0 0-1.1 0l-8.8 5v-3.5l7.3-4.2a6.7 6.7 0 0 1 10 7m-19 6.2-3-1.8h-.1V15a6.7 6.7 0 0 1 11-5.2l-.2.2-7.1 4a1 1 0 0 0-.6 1.1zm1.6-3.6 4-2.2 3.8 2.2v4.5L24 28.5l-3.9-2.3z"
              />
            </g>
          </g>
        </g>
        <defs>
          <clipPath id="openai-clip-a">
            <path fill="#fff" d="M0 0h48v48H0z" />
          </clipPath>
        </defs>
      </>
    ),
  },
  Leonardo: {
    viewBox: "0 0 48 48",
    content: (
      <>
        <path fill="#fdfdfd" d="m27.7 40.7.2.3c-.2.3-.8 1.6-1.6 2.6l-1.2 1v.1H25s-1 .5-2 0h-.1l-1.2-1.1c-.8-1-1.4-2.3-1.6-2.6l.2-.3.5.8 1 1.7q1 1.2 1.1 1.2 0 .1.8.3h.6q.8-.1.8-.3.2 0 1-1.2h.1l1-1.7z"/><path fill="#dc01ff" d="m45.3 26.1.3.2q0 1-.2 2l-1 2.4q.8-2.1.9-4.6"/><path fill="#dc01ff" d="M45.3 28.2h.1A21 21 0 0 1 36 42.8q-.6.4-1.1.4l.5-.5c4.3-2.7 7.6-7 9-12q.6-1.2 1-2.5"/><path fill="#ff8d02" d="M44.4 30.7c-1.4 5-4.7 9.3-9 12l3.3-3q2.5-2.4 3.9-5z"/><path fill="#eaeaec" d="M44.4 30.7c0 .2-.6 1.9-1.8 4l.1-.6q.9-1.2 1.7-3.4"/><path fill="#eaeaec" d="M45.3 26.1q-.1 2.4-.9 4.6-.9 2-1.7 3.4a1 1 0 0 0-.5-1.1l.2-.4a20 20 0 0 0-.6-16.7l.3-.1a1 1 0 0 0 .6-1.3q2.5 4.5 2.6 10"/><path fill="#fdfdfd" d="M42.2 33a1 1 0 0 1 .5 1l-.5.9v.2a1 1 0 0 1-1.1 0l.2-.3h.2a1 1 0 0 0 .8-1v-.1h-.1v-.1H42v-.1z"/><path fill="#fdfdfd" d="m42.2 34.9.5-.8a1 1 0 0 1-.6 1z"/><path fill="#f05601" d="M42.6 34.6q-1.5 2.7-4 5.1c1.5-1.6 3-4 3-4l.5-.6z"/><path fill="#22245c" d="M42.1 33.5"/><path fill="#fdfdfd" d="m42.1 33-.1.4h-.1l-.2-.1v-.5z"/><path fill="#22245c" d="M41.8 33.3"/><path fill="#202541" d="m42.4 17-.6-1h-.1v16.8l.4.2.3-.4a20 20 0 0 0 0-15.5"/><path fill="#22245c" d="M41.7 33.3h.2v.1l-.2.6zm0 .7"/><path fill="#fefefe" d="M41.7 32.8"/><path fill="#f1cf25" d="m41.7 32.6-.3-.3V16h.3z"/><path fill="#fefefe" d="m41.4 32.3.3.3v.2h-.3z"/><path fill="#1e205d" d="M41.7 15.5"/><path fill="#22245c" d="M41.7 34.2h-.2zm0-.1h-.1m-.1-.8v.7h-.2v-.7m.2.7"/><path fill="#f05601" d="m41.5 35.2.6-.1-.5.7s-1.5 2.3-3 4l-1.5 1.4c-1.2.9-2.5 1.4-3 1l.2-.3a20 20 0 0 0 4.2-3.4v-.1h.1q1.5-1.5 2.5-3.3z"/><path fill="#1e205d" d="M42.1 14.4a1 1 0 0 1-.3 1h-.1v.1h-.5l-.2-.1-.1-.2-.1-.1v-.3h-.1v-.3l.1-.2h.1v-.1l.2-.1a1 1 0 0 1 1 .3"/><path fill="#fefcfd" d="M41 15.6v.2a1.2 1.2 0 1 1 1.5-1.7l.2.4a1.2 1.2 0 0 1-1.2 1.5zm-.2-.5v.1h.1v.1h.1l.1.1h.2v.1h.6a.8.8 0 1 0-1-1.3v.1l-.2.2v.5"/><path fill="#fefcfd" d="m41.4 16-.5-.2.2-.2z"/><path fill="#f1cf25" d="M41.4 16"/><path fill="#fdfdfd" d="M41.4 33h.1l-.1.1zm0-.2h.3l-.2.2h-.1z"/><path fill="#fdfdfd" d="M41.4 33.3V33l.1-.1.1-.2v.5z"/><path fill="#22245c" d="M41.4 33.3"/><path fill="#202541" d="M41.4 32.3c-.8-.7-2.7-2.6-3.7-5q-.6-2-1-3.9l4.7-7.3z"/><path fill="#00e9bf" d="m41 15.8.4.2-4.7 7.4-.3-1.1 4.4-6.3z"/><path fill="#fefefe" d="m41.4 32.8-.3.1c-2.7-.5-4.4-3.7-4.8-5q-.7-2-1.3-6.7c-.3-3-1-5.1-1.2-5.6h1.4l.5 2.6.7 4-.6 1 .6.5.3-.3q.4 2 1 3.8c1 2.5 2.9 4.4 3.7 5.1z"/><path fill="#fdfdfd" d="m41 33 .4-.2v.1z"/><path fill="#fdfdfd" d="M41 33h.4v.1l-.2.3H41l-.1.1-.2.2h-.4a1 1 0 0 1 .7-.8"/><path fill="#22245c" d="M42.2 33.6v.7a1 1 0 0 1-.7.4h-.2l.2-.4.2-.1V34q0-.4.3-.7v.1h.1zm-1-.3"/><path fill="#fdfdfd" d="m41.2 34.7-.1.4h-.2l-.3-.3.4-.2zm0-1.3.2-.3v.2z"/><path fill="#1e205d" d="M41.2 15.4"/><path fill="#22245c" d="m41 34.6.5-.2-.2.3H41m0 0"/><path fill="#fdfdfd" d="M40.8 34.4v.2h.1l-.4.2-.2-.2z"/><path fill="#202541" d="M41 35v.1a20 20 0 0 1-2.5 3.4C37 40 34.7 41 34.7 41v-.2q.7-1.4 1.4-3.7l4.5-2.2z"/><path fill="#22245c" d="m40.9 34.5.6-.3h.1l-.1.3-.5.2zm.3-1.1-.4.3.2-.2zm-.4.9v-.4l.4-.4v-.1h.1v.8h.2z"/><path fill="#fefcfd" d="M40.8 14.3"/><path fill="#1e205d" d="M40.8 15"/><path fill="#fdfdfd" d="M40.4 33.8h.4v.6l-.4.2z"/><path fill="#1e205d" d="M40.7 14.9"/><path fill="#1f2a48" d="M38 10.8q1.5 1.5 2.6 3l-.1.3-9.7-4.7-.5-.5-2.5-3.6A20 20 0 0 1 38 10.8"/><path fill="#fdfdfd" d="m40.4 34.6.2.2-4.5 2.2.1-.4z"/><path fill="#986f09" d="M39.2 10.2c.5.6 1.9 2.3 2.5 3.4l-.8.1-.3.2a20 20 0 0 0-3-3.7z"/><path fill="#f9b309" d="m30.8 9.4 9.7 4.7-.2.3-9-4.4zm9.5 5.5v.3h-5l-.3-.3z"/><path fill="#01ff94" d="m40.3 10.4-.7-.1q-2.3-2.5-5.3-4.2l.3-.3a22 22 0 0 1 5.7 4.6"/><path fill="#ff7801" d="M45.7 24.4a22 22 0 0 0-5.5-14l-.6-.1a21 21 0 0 1 3 3.8v.4q2.6 4.6 2.7 10v1.6l.3.2.1-1.5z"/><path fill="#e5e2e5" d="m39.2 10.2.4.1z"/><path fill="#986f09" d="m39.2 10.2.4.1q1.6 1.7 2.7 3.6l-.6-.3c-.6-1-2-2.8-2.5-3.4"/><path fill="#202541" d="M38 39a20 20 0 0 1-3.7 2.9l.4-1s2.4-1 3.8-2.4z"/><path fill="#f05601" d="m37 41.2 1.7-1.5z"/><path fill="#ffe9b6" d="m37 34.2-.8 2.4-.8.4.7-2.9z"/><path fill="#fefefe" d="m36.7 23.4-.3.3-.6-.6.6-.8z"/><path fill="#fdfdfd" d="m35.4 37 .8-.4-.1.4-.9.4z"/><path fill="#f6515b" d="m34.5 33.6.3.2 1.3.3-.7 3-1.6.7z"/><path fill="#fefefe" d="M35.4 15.2h-.5v-.3h.1z"/><path fill="#ff8d02" d="M34.9 43.2h-.3l.8-.5z"/><path fill="#fde5d0" d="m34.7 41-.8-.6.1-.1q.8-1.5 1.2-2.9l.9-.4z"/><path fill="#ff8d02" d="m34.6 5.8-.3.3Q29.7 3.5 24 3.5V3a22 22 0 0 1 10.6 2.7m-.4 36.4c.4.4 1.7-.1 2.9-1l-2.5 2-.3-.1q-.4-.3-.2-.7z"/><path fill="#a70d75" d="m34.5 33.6-.7 4.2-1.4.7c.3-2.5.3-6 .3-6s.9.7 1.8 1.1"/><path fill="#feca3c" d="M36.3 27.9q-.7-2-1.3-6.7c-.3-3-1-5.1-1.2-5.6l-1.9-.5 1 2a16 16 0 0 1 .5 4l.2 2.6c.1 1.5.4 4 1.3 6.4a6 6 0 0 0 5.5 3.7 1 1 0 0 1 .7-.9c-2.7-.5-4.4-3.7-4.8-5"/><path fill="#fefefe" d="M27.3 9.4a12 12 0 0 1 2.8 2.2 10 10 0 0 0-4.3-3.3h-.2l-.1-.1h-.3l-.3-.1h-.3l-.1-.1h-.3V6.7a9 9 0 0 1 5.2 1.5l1 1.4.9.4 1.1 1.7Q34 14 35 14.9v.3h.4l.1.1q-1.2-.1-2.3-.5L30.7 13l-3.2-2.4c-1.4-1-3-1-3.3-1V8.2h.5l.2.1 1.6.6q.3 0 .4.2z"/><path fill="#fdfdfd" d="m32.4 38.5 1.4-.7-.1.4-1.4.6z"/><path fill="#fdfdfd" d="M33.7 38.2v-.4l1.7-.8-.2.4z"/><path fill="url(#a)" d="m32.3 38.9 1.4-.7-.1.4q-.9 3-3.7 4.7a13 13 0 0 1-4.8 1.4l1.2-1.1c2 .3 5.2-1.5 5.8-3.7z"/><path fill="url(#b)" d="M36.1 32.5a9 9 0 0 1-2-3.9c-.4-1.7-.5-2.6-.6-4.7v-3.3s-.2-2-.6-3.4l-1-2.1-2.3-1a14 14 0 0 1 2.5 6.8q0 3-.2 5.5c0 2.2 1 6.2 5.2 7z"/><path fill="#202541" d="m27.9 41 4.4-2.1-.2 1c-.6 2.2-3.8 4-5.8 3.7.8-1 1.4-2.3 1.6-2.6"/><path fill="#ffbb01" d="m27.5 10.6 3.2 2.4 2.5 1.8c-2.2-.8-4-2.1-5.6-3.1-2-1.4-3.4-1.7-3.4-1.7v-.5c.3 0 2 .2 3.3 1"/><path fill="#202541" d="M40.3 14.4v.5H35q-1-1-2.6-3.2L31.3 10z"/><path fill="url(#c)" d="M29.4 19.1q1.1.4 1.6.9l.2.7-1.7-.1.1-.2v-.2l.2-.1-.5-.4q-.7-.4-1.2-.3-.7 0-1.4.8l-.6.6q-.5.4-.5.6l-.7-.1v-.5q0-1.8.8-1.8a15 15 0 0 1 3.7.1"/><path fill="#fefefe" d="M30.8 9.4h-.3l-.2-.5zm-.5-.5-.9-.7-2-3h.4z"/><path fill="#fefefe" d="m31.3 10-1-.4-.9-1.4.9.7.2.4.3.1z"/><path fill="#fffdfe" d="m27.7 40.7.2-.4.8-1.5.5-.9c.2-.7.7-2.2.8-3.5q0-1.5-.6-3l-.5-.8a14 14 0 0 0-3.4-3q-.4 0-.1-.3l.9-.5a7 7 0 0 0 3.5 2.8s-1-2.6-.8-2.6c.2-.1 1.6.8 2 2 .6 1.4.4 4 0 5.6-.3 1.5-1.2 2.8-1.7 3.8L28 40.5z"/><path fill="#15134a" d="M27.5 9.1a11 11 0 0 1 2.6 2.5 14 14 0 0 0-2.8-2.2l-.4-.2-.4-.2-1.6-.6h-.7V8h.7l.3.1h.2l.1.1h.1l1 .5z"/><path fill="#250ef0" d="M28.7 35.3q.1.1.2 1.7l-.2 1.8-.8 1.5-.7 1.2-2.2-.2q-.7 0 0-.7c.4-.3 3.3-3 3.5-4q.1-1.4 0-1.7z"/><path fill="#f9db00" d="M28.8 38.6c.5-.8.9-5.5.7-6.7q0-.2-.2-.5.8 1.5.7 3a15 15 0 0 1-.8 3.5l-.5 1z"/><path fill="#162653" d="M29.5 32a21 21 0 0 1-.7 6.6q.2-.5.1-1.6-.1-1.6-.2-1.7v-1.8a5 5 0 0 0-1-2.8q-.9-1.4-2.4-1.4-1.3.2-1.3.4v-.6s.6-.5 1.4-.5 1.6.7 2.2 1c.4.3 1.3 1 1.7 1.8z"/><path fill="#071c50" d="M28.3 20.9c-.7 0-1.1-.6-1.1-.7q.1-.2 1-.5.8 0 1.2.4h.2v.1h-.1c-.1.1-.6.7-1.2.7"/><path fill="#fdfdfd" d="M32.3 38.9 27.9 41l.2-.5 4.3-2z"/><path fill="#fffdfe" d="m27.9 41-.2-.3.4-.2z"/><path fill="#ecedf6" d="m27 4.3.8 1-.4-.1-.6-.8z"/><path fill="url(#d)" d="M26.9 24.4q.5.8.5 1.5l.2 1h-.3l-.5-.4s.4-.2.3-.6-.7-1.5-1.6-1.3v-3.2l.6-.6h.3l-.4.4v1.9q.3.7.9 1.3"/><path fill="#ecedf6" d="M27.4 5.2 25.2 5q-.1-1.1-1.2-1.2v-.3a21 21 0 0 1 15.6 6.8h-.4q-.6-.2-1.7-.1a20 20 0 0 0-9.7-5l-.7-1-.3.2z"/><path fill="url(#e)" d="m31.2 20.8-1.7-.2q-.3.4-.8.6c-.5.3-1.2-.1-1.5-.3q-.5-.3-.8 0 .5 0 1 .6.7.5 1.5.2l1.9-.8-1.4 2.9a10 10 0 0 0-1.2 3l.1.5.5-.8.3-.5 1.7-2.9q.3-.6.4-1.5z"/><path fill="#f6f6f6" d="m30.8 21-1.4 2.8a10 10 0 0 0-1.2 3l.1.5v.3l-.7-.6-.2-1q0-.8-.5-1.6-.6-.6-.9-1.3v-1.9l.4-.3q.5 0 1 .6.8.5 1.5.2z"/><path fill="url(#f)" d="M27.2 20.2s.4.6 1 .7 1.2-.6 1.3-.6q.2 0 .1.1l-.1.2q-.3.4-.8.6c-.5.3-1.2-.1-1.5-.3q-.5-.3-.8 0H26l.6-.7q.7-.8 1.4-.8.5 0 1.2.3l.5.4h-.4q-.4-.3-1.3-.4z"/><path fill="url(#g)" d="M33.6 23.7c.1 1.5.4 4 1.3 6.4a6 6 0 0 0 5.5 3.7v.8l-4.2 2 .8-2.4-1-.1-1.5-.5q-1.6-.8-1.8-1s0 3.4-.3 5.9l-4.3 2 1.2-2.1c.5-1 1.4-2.3 1.8-3.8.3-1.5.5-4.2 0-5.5S29 26.9 29 27c-.2 0 .8 2.6.8 2.6q.1 0-1.3-1.5c-1-.9-2.2-1.3-2.2-1.3q-.5 0-1 .3-.5.6-1.3.7v-.4c.4 0 1-.6 1-.7l.2-.4.7.1q.5 0 .6-.3l-.2-.5q-.3-.5-.7-.2l-.6.3-.1-1.1v-3.3l.7.1c-.1.4 0 3.2 0 3.2.8-.2 1.4.9 1.5 1.3q-.1.6-.2.6t.4.4h.3l.7.7v-.3l.5-.8.3-.5 1.7-2.9q.3-.6.4-1.5v-.9L31 20l-.9-2.5c-.2-.7-.7-2.9-2.6-4.5a6 6 0 0 0-3.5-1.4V8.3h.2V10q.2-.2 3.4 1.7a24 24 0 0 0 5.6 3q1 .5 2.3.6l-.1-.1h5v.2l.5.4-.1.2-4.4 6.3-.7-4.1-.5-2.5-1.4-.1-1.9-.5-2.3-1a14 14 0 0 1 2.5 6.8q0 3-.2 5.5c0 2.2 1 6.2 5.2 7l-1-.9a9 9 0 0 1-2-3.9c-.4-1.7-.5-2.6-.6-4.7v-3.3"/><path fill="#15134a" d="m27.4 5.2 2 3a9 9 0 0 0-5.2-1.5V8H24V6.2A1.2 1.2 0 0 0 25.2 5q1 0 2.2.2"/><path fill="#fefefe" d="M23.2 5a.8.8 0 1 0 1.6 0 .8.8 0 0 0-1.6 0m.8-1.2A1.2 1.2 0 1 1 22.8 5Q23 3.9 24 3.8"/><path fill="url(#h)" d="M25.1 44.7s3-.2 4.8-1.4a8 8 0 0 0 3.8-5.1l1.5-.8-1.3 3a9 9 0 0 1-3.8 3.4 20 20 0 0 1-5 1z"/><path fill="url(#i)" d="M25 44.7h.2q2.5 0 5-1-2.3 1.2-5.2 1"/><path fill="#1e205d" d="M24 4.3a.8.8 0 1 1 0 1.5.8.8 0 0 1 0-1.5"/><path fill="#15134a" d="M24 8h.2v.3H24z"/><path fill="#ecedf6" d="M24 3.5v.3q-1 0-1.2 1.2-1 0-2.2.2l.6-.8-.3-.1-.7 1a20 20 0 0 0-9.7 4.9l-2.1.1c3.9-4.2 9.4-6.8 15.6-6.8"/><path fill="#2702ff" d="M24 3v.5a21 21 0 0 0-17.3 8.9l-.4-.2A22 22 0 0 1 24 3.1"/><path fill="#15134a" d="m20.6 5.2 2.2-.2q0 1.1 1.2 1.2V8h-.2V6.7a9 9 0 0 0-5.2 1.5z"/><path fill="#15134a" d="M24 8v.3h-.2V8z"/><path fill="url(#j)" d="m31 20-.9-2.5c-.2-.7-.7-2.9-2.6-4.5a6 6 0 0 0-3.5-1.4c-.5 0-2 .1-3.5 1.4-1.9 1.6-2.4 3.8-2.6 4.5L17 20q.5-.5 1.6-.9-.3-.4-.2-1.5.3-1.7 1.7-3.3a6 6 0 0 1 3.9-1.8 6 6 0 0 1 3.9 1.8c.9 1 1.5 2.4 1.7 3.3q.1 1.1-.2 1.5 1.1.4 1.6.9"/><path fill="#fdfdfd" d="M29.6 17.6q-.3-1.7-1.7-3.3a6 6 0 0 0-3.9-1.8v6l-.3 2c-.2 1.4 0 4.4 0 5.3q0 1.3.3 1.6c.4 0 1-.6 1-.7l.2-.4.7.1q.5 0 .6-.3l-.2-.5q-.3-.5-.7-.2l-.6.3-.1-1.1v-3.8q0-1.8.8-1.8a15 15 0 0 1 3.7.1q.3-.4.2-1.5"/><path fill="#162653" d="M19 37q0 1.1.2 1.6a21 21 0 0 1-.7-6.7q0-.2.2-.5c.4-.9 1.3-1.5 1.7-1.8.6-.3 1.4-1 2.2-1s1.4.5 1.4.5v.6q0-.2-1.3-.4-1.5 0-2.5 1.4v.1q-.9 1.3-.8 2.7l-.1 1.8q-.1.1-.2 1.7"/><path fill="#fefefe" d="M25.3 29.3q-1.3.2-1.3.4 0-.2-1.3-.4-1.6 0-2.5 1.4.3.3 1.1.4c.9 0 1.7-.4 1.7-.4q0 .2 1 .4 1-.2 1-.4s.8.5 1.7.4q1-.1 1-.4-.9-1.4-2.4-1.4"/><path fill="url(#k)" d="M24.7 32.1q0-.2-.7-.3t-.7.3l-.3.4h2q0-.2-.3-.4"/><path fill="#4f00ec" d="m24 42.5.8.2 1.4.5q-1 1.2-1.1 1.2 0 .2-.8.3h-.6q-.8-.2-.8-.3-.2 0-1-1.2z"/><path fill="#ff8701" d="M23.8 9.5v.5q-.2-.2-3.4 1.7c-1.5 1-3.4 2.3-5.6 3q1.1-.6 2.5-1.7l3.2-2.4c1.4-1 3-1 3.3-1"/><path fill="#15134a" d="m19.2 10.4-1.3 1.2a10 10 0 0 1 4.3-3.3h.2l.1-.1h.3l.3-.1h.3l.1-.1h.3v.3h-.5l-.2.1-1.6.6q-.3 0-.4.2l-.4.2z"/><path fill="#fffdfe" d="m25.5 33-.3-.4-.2-.1h-2l-.2.1-.3.3v2q.4 1.1 1 2.1l.2.6.3 1.3.3-1.3.2-.6q.6-1 1-2z"/><path fill="url(#l)" d="M26.5 34.7a3 3 0 0 0-1-1.8v2q-.4 1.1-1 2.1l-.2.6-.3 1.3-.3-1.3-.2-.6q-.6-1-1-2v-2l-.2.1q-.3.2-.8 1.6v.6q0 .6.3 1l.3.6 1.9 3.3 2-3.3.2-.5.3-1z"/><path fill="url(#m)" d="M18.2 20.1h.2v.3l.1.2-1.7.1.2-.7q.5-.5 1.6-.9l.7-.1h3q.8 0 .8 1.8v.5l-.7.1q0-.2-.4-.5l-.7-.7q-.7-.8-1.4-.8-.5 0-1.2.3z"/><path fill="#250ef0" d="M19.5 36.7c.2.8 3 3.6 3.5 4q.7.4 0 .6l-2.2.2-.7-1.2-.8-1.5-.1-.2q-.2-.5-.1-1.6.1-1.6.2-1.7l.2-.4s-.2 1 0 1.8"/><path fill="url(#n)" d="M14.6 20.5V24c-.2 2.1-.3 3-.7 4.7a9 9 0 0 1-2 4l-1 .8c4.3-.8 5.2-4.8 5.2-7Q16 24 16 21q0-.7.2-1.6c.4-2.8 2.2-5.2 2.3-5.3q.1 0-2.2 1H16l-1.9.6h-1.4l-.5 2.6-.7 4L7.3 16l-.1-.2.5-.6h5l-.2.1 2.3-.5c2.2-.8 4-2.1 5.6-3.1 2-1.4 3.4-1.7 3.4-1.7V8.3h.2v3.3c-.5 0-2 .1-3.5 1.4-1.9 1.6-2.4 3.8-2.6 4.5l-1 3.2v.1l-.1.8q0 1 .4 1.5l1.7 3q.3.2.3.4l.5.8v.3l.7-.6.3-.1q.6-.3.4-.4-.2 0-.2-.6c.1-.4.7-1.5 1.6-1.3v-3.2l.6-.1v3.3l-.1 1-.6-.2q-.4-.3-.7.2-.4.3-.2.5 0 .1.6.3l.7-.1.1.4q.4.4 1.1.7v.4q-.8-.1-1.3-.7-.5-.4-1-.3s-1.2.4-2.2 1.3q-1.4 1.5-1.3 1.5s1-2.6.8-2.6c-.2-.1-1.6.8-2 2-.6 1.4-.4 4 0 5.6.3 1.5 1.2 2.8 1.7 3.8l1.2 2.1-4.3-2c-.3-2.5-.3-6-.3-6s-.9.7-1.8 1.1l-.3.2-1.3.3-.9.1.8 2.4-4.2-2v-.8c2.2-.1 4.6-1.5 5.5-3.7 1-2.4 1.2-4.9 1.3-6.4"/><path fill="#ddd3c0" d="M21.7 25.6q.3-.5.7-.2l.6.3.1-1.1v-3.8q0-1.8-.8-1.8a15 15 0 0 0-3.7.1q-.3-.4-.2-1.5.3-1.7 1.7-3.3a6 6 0 0 1 3.9-1.8v6l-.3 2c-.2 1.4 0 4.4 0 5.3q0 1.3.3 1.6c-.4 0-1-.6-1-.7l-.2-.4-.7.1-.6-.3z"/><path fill="url(#o)" d="M23 44.7q-3 .2-5.1-1a20 20 0 0 0 5.1 1"/><path fill="url(#p)" d="m14.3 38.2 1.4.6.2 1c.6 2.3 3.8 4.1 5.8 3.8q.6.7 1.2 1s-3-.1-4.8-1.3a8 8 0 0 1-3.8-5.1"/><path fill="url(#q)" d="M18.4 20.1h-.2l.5-.4q.7-.4 1.2-.3.7 0 1.4.8l.7.7h-.4q-.3-.3-.8 0c-.3.2-1 .6-1.5.3l-1-.8.1-.2h.1c.1.1.6.7 1.2.7s1.1-.6 1.1-.7q-.1-.2-1-.5-.7 0-1.2.4z"/><path fill="url(#r)" d="M22 20.9q.3.3.4.5c.1.4 0 3.2 0 3.2-.8-.2-1.4.9-1.5 1.3q.1.6.2.6t-.4.4h-.3l.2-1q0-.7.5-1.5.6-.7.9-1.3v-1.9l-.4-.4h.3"/><path fill="#c8c090" d="M22 21.2v1.9q-.3.6-.9 1.3-.5.8-.5 1.5l-.2 1-.7.7v-.8q.1-.4-1-3l-1.5-2.9 1.9.8q.8.2 1.4-.3t1.1-.6z"/><path fill="#252842" d="M25 40.6c.4-.3 3.3-3 3.5-4q.1-1.4 0-1.7l-.7-1-.2-.2-1.8-1.9q-.9-.8-.8-1 0 .2-1 .3-1-.2-1-.4 0 .3-.8 1.1l-2 2.1-.2.3-.5.7s-.2 1 0 1.8 3 3.6 3.5 4q.7.4 0 .6l-2.2.2 1 1.7 2.2-.7.8.2 1.4.5 1-1.7-2.2-.2q-.7 0 0-.7m-1-.4-2-3.3-.2-.5-.3-1v-.7a3 3 0 0 1 1-1.8l.3-.3.2-.1q0-.2.3-.4 0-.2.7-.3t.7.3l.3.4.2.1.3.3.2.2q.3.2.8 1.6v.6q0 .6-.3 1l-.3.6z"/><path fill="#24254b" d="M21.7 43.6c-2 .3-5.2-1.5-5.8-3.7l-.2-1L20 41c.2.3.8 1.6 1.6 2.6"/><path fill="url(#s)" d="M17.9 43.8a9 9 0 0 1-4-3.5l-1.1-2.9 1.5.8.1.4q.9 3 3.7 4.7c1.8 1.2 4.8 1.4 4.8 1.4h-.1q-2.5 0-5-1"/><path fill="#ecedf6" d="m21.2 4.4-.6.8h-.4l.7-1z"/><path fill="#fffffb" d="m20.6 5.2-2 3-.9.7 2.5-3.6z"/><path fill="#071c50" d="m19.9 19.7 1 .5s-.5.6-1.2.7-1-.6-1.2-.6V20q.6-.4 1.4-.4"/><path fill="#f7b41e" d="M28.7 35.3v-1.8a5 5 0 0 0-1-2.8q0 .3-1 .4c-.9 0-1.7-.4-1.7-.4q0 .3.8 1.1l2 2.1.2.3.5.7z"/><path fill="url(#t)" d="M21.3 31.1q-1-.1-1-.4l-.2.1q-.7 1.4-.7 2.7l.1 1.4.5-.7.2-.3.2-.2 1.8-1.9q.8-.8.8-1s-.8.4-1.7.3"/><path fill="#fdfdfd" d="m20.3 40.7-.2.3-.2-.5z"/><path fill="#272742" d="m20.2 5.3-2.5 3.6-.5.5-9.7 4.7-.1-.2a20 20 0 0 1 12.8-8.6"/><path fill="#fdfdfd" d="m19.9 40.5.2.5-4.4-2.1v-.4zm1.8-13.7 1 .5q.1.1-.2.4a14 14 0 0 0-3.4 2.9l-.5.8a6 6 0 0 0-.6 3c.1 1.3.6 2.8.8 3.5l.5 1 .8 1.4.2.4-.4-.2-1.2-2.1c-.5-1-1.4-2.3-1.8-3.8-.3-1.5-.5-4.2 0-5.5s2-2.2 2.1-2.1c.2 0-.8 2.6-.8 2.6q-.1 0 1.3-1.5c1-.9 2.2-1.3 2.2-1.3"/><path fill="#05b5cc" d="M20.5 21.4q.6-.5 1.1-.6-.3-.2-.8 0c-.3.3-1 .7-1.5.4l-.8-.6-1.7.1v.9q0 1 .4 1.5l1.7 3q.3.2.3.4l.5.8v-.5q.1-.4-1-3l-1.5-2.9 1.9.8q.8.2 1.4-.3"/><path fill="url(#u)" d="M29 30.6a14 14 0 0 0-3.5-3q-.3 0-.1-.3l.9-.5q-.5 0-1 .3-.5.6-1.3.7-.8-.1-1.3-.7-.5-.4-1-.3l1 .5q.1.1-.2.4a14 14 0 0 0-3.4 2.9l-.5.8c.5-.9 1.4-1.5 1.8-1.8.6-.3 1.4-1 2.2-1s1.4.5 1.4.5.6-.5 1.4-.5 1.6.7 2.2 1c.4.3 1.3 1 1.7 1.8z"/><path fill="url(#v)" d="M18.5 32a21 21 0 0 0 .8 6.8l-.5-.9a15 15 0 0 1-.8-3.5q0-1.5.6-3z"/><path fill="#fefefe" d="m18.6 8.2-1 1.4-.9.4.5-.6h.3l.2-.5z"/><path fill="#8e485f" d="m16.2 15 2.2-1a14 14 0 0 0-2.5 7l-1.3.1v-.5s0-2 .5-3.4q.7-1.7 1-2.1"/><path fill="#fefefe" d="m17.7 9-.2.3-.3.1z"/><path fill="#272742" d="m7.7 14.4 9-4.4-1.1 1.7Q14 14 13 14.9H7.7z"/><path fill="#dd5a79" d="m14.2 15.6 1.9-.5-1 2-.5 3.5v.5H13c.3-2.8 1-5 1.2-5.5"/><path fill="#2b66ab" d="M15.9 21q0 3 .2 5.4c0 2.2-1 6.2-5.2 7l1-.9c.6-.5 1.6-2.2 2-3.9s.5-2.6.6-4.7V21q.8 0 1.4-.2"/><path fill="#fdfdfd" d="m15.7 38.9-1.4-.7v-.4l1.3.7z"/><path fill="#2b21eb" d="m15.6 38.5-1.4-.7-.7-4.2c1-.4 1.8-1 1.8-1s0 3.4.3 5.9"/><path fill="#fdfdfd" d="m14.3 38.2-1.5-.8-.2-.4 1.6.8z"/><path fill="#fefcfd" d="m12.8 15.7 1.4-.1c-.2.5-.9 2.7-1.2 5.5q-.6 4.8-1.3 6.8c-.4 1.3-2.1 4.5-4.8 5h-.3v-.6c.8-.7 2.7-2.6 3.7-5q.7-2 1-4l.4.4.6-.6-.7-1 .7-3.9z"/><path fill="#ffe3b4" d="M14 40.3v.1l-.7.5v-.2q-.7-1.4-1.4-3.7l.9.4q.4 1.5 1.2 2.9"/><path fill="url(#w)" d="M13 21.1h1.6l-.2 2.6c-.1 1.5-.4 4-1.3 6.4a6 6 0 0 1-5.5 3.7 1 1 0 0 0-.7-.9c2.7-.5 4.4-3.7 4.8-5q.7-2 1.3-6.7"/><path fill="#3858d6" d="m13.5 33.6.7 4.2-1.6-.8-.7-2.9z"/><path fill="#15134a" d="m12 37 1.3 4s-2.4-1.1-3.8-2.5v-.1h-.1Q7.9 36.9 6.9 35h.2l.3-.3z"/><path fill="#fefefe" d="M13 14.9v.3h-.4z"/><path fill="#ff7f16" d="M7.7 14.9H13l-.4.3h-5z"/><path fill="#fdfdfd" d="m12.8 37.4-.9-.4-.1-.4.8.4z"/><path fill="#fefefe" d="m14.8 14.8-2.3.5.1-.1h.5v-.3H13q1-1 2.6-3.2l1.1-1.7 1-.4.9-1.4a9 9 0 0 1 5.2-1.5V8H23l-.3.1h-.2l-.1.1h-.1l-1 .5a9 9 0 0 0-2.3 1.6q-.7.6-1.2 1.3a14 14 0 0 1 2.8-2.2l.4-.2.4-.2 1.6-.6h.7v1.1c-.3 0-2 .2-3.3 1-1.5 1-2.2 1.7-3.2 2.5z"/><path fill="#fefcfd" d="m11.6 22.2.7 1-.6.5-.3-.4z"/><path fill="#ffe3b4" d="m12 34.1.6 3-.8-.5-.8-2.4z"/><path fill="#fdfdfd" d="m12 37-4.6-2.2.2-.2 4.2 2z"/><path fill="#e03528" d="M8.8 10.2h1.7a20 20 0 0 0-3.1 3.7 1 1 0 0 0-1.1-.3l.7-1q1-1.6 1.8-2.4"/><path fill="#069ebf" d="M9.5 38.5a14 14 0 0 0 3.8 2.4l.4 1a20 20 0 0 1-4.2-3.4"/><path fill="#ff5b32" d="M8.4 10.3h.4Q8 11 7 12.4l-.3-.1q.7-1 1.7-2"/><path fill="#fefcfd" d="M7.1 13.7a1 1 0 0 1 .6 1.5l-.1.2-.4.4-.2-.2-.4.3h-.4l-.3-.1a1 1 0 0 1-.6-1.3l.2-.4.2-.2a1 1 0 0 1 1.4-.2m-1 1.7h.2v.1h.5l.2-.1.1-.2.1-.1v-.3h.1v-.3l-.1-.2H7V14a.8.8 0 1 0-.9 1.3"/><path fill="#fdfdfd" d="M7 33a1.2 1.2 0 0 1 .4 1.8 1 1 0 0 1-1 .4l-.5-.1-.6-.6V34a1 1 0 0 1 .5-1A1 1 0 0 1 7 33m-1 .4-.1.1v.1h-.1v.8q.2.4.7.4h.3v-.1H7v-.1l.1-.2.1-.2v-.5l-.2-.2-.2-.1v-.1H6z"/><path fill="#fff3bf" d="m7.5 14 9.7-4.6-.5.6-9 4.4z"/><path fill="#1e205d" d="m7.1 14.3.2.2v.5l-.1.1-.1.2H7l-.1.1h-.2v.1H6A.8.8 0 1 1 7 14zm.2.7v-.1m-.1-.7"/><path fill="#fefcfd" d="m7 15.6.2.2-.6.2z"/><path fill="#22245c" d="M7 34.6"/><path fill="#1e205d" d="M6.8 15.4"/><path fill="#22245c" d="M6.8 33.3"/><path fill="#06c6fc" d="m6.3 12.2.4.2L5.5 14l-.2.4Q2.8 19 2.7 24.7l-.4-.3a22 22 0 0 1 4-12.2"/><path fill="#ff5359" d="m6.6 16 .6-.2.1.2 4.3 6.2-.2 1.1z"/><path fill="#15134a" d="M10.3 27.2c-1 2.5-2.9 4.4-3.7 5.1V16l4.8 7.3z"/><path fill="#fefcfd" d="M6.6 32.3v.5h-.3v-.2z"/><path fill="#22245c" d="M6.6 33.3"/><path fill="#f89120" d="M6.5 16h.1v16.3l-.3.3V16z"/><path fill="#22245c" d="M6.5 34.8a1 1 0 0 1-.8-1v-.1h.1v-.1H6v-.2h.1l.2-.1h.5l.1.1H7v.1l.2.2v.7H7l-.1.2h-.1l-.1.1h-.3"/><path fill="#1e205d" d="M6.3 15.5"/><path fill="#22245c" d="M6.3 33.3"/><path fill="#fefcfd" d="M6.3 32.8"/><path fill="#272742" d="M6.2 16A20 20 0 0 0 4 24.7 20 20 0 0 0 5.8 33l.5-.2V16z"/><path fill="#22245c" d="M5.9 33.5"/><path fill="#069ebf" d="M5.9 35a1 1 0 0 0 1 .1 20 20 0 0 0 2.6 3.4 20 20 0 0 0 4.2 3.4l.1.3c-.6.6-3-.8-4.5-2.5l-1-1.2-2-2.7z"/><path fill="#069ebf" d="M8.3 38.5 6 35.1l.5.7s.9 1.4 2 2.7"/><path fill="#ff5b32" d="m5.7 13.9 1-1.5.3.1-.7 1z"/><path fill="#ece8e7" d="M2.7 24.7q.1-5.6 2.6-10.2a1.2 1.2 0 0 0 .9 1.4A20 20 0 0 0 4 25a20 20 0 0 0 1.8 8 1 1 0 0 0-.5 1l-1.7-3.3q-.8-2.2-.9-4.6"/><path fill="#03b9ff" d="M3.6 30.9a18 18 0 0 0 2 4l2.7 3.6 1 1.2c1.5 1.7 3.9 3.1 4.5 2.5v.2q.3.3-.1.7l-.3.1Q6.2 39 3.6 31"/><path fill="#0165fe" d="m2.7 28.2.9 2.5v.1q2.6 8.1 9.8 12.4-.5 0-1.4-.4a22 22 0 0 1-9.4-14.6"/><path fill="#ece8e7" d="M5.3 34.5a18 18 0 0 1-1.7-3.6v-.1L5.3 34z"/><path fill="#0165fe" d="m3.6 30.7-1-2.5-.2-2 .3-.1q.2 2.4.9 4.6"/><path fill="#06c6fc" d="M2.7 25.1v-.4l-.4-.3v1.9l.4-.2z"/><defs><linearGradient id="leonardo-a" x1="25.1" x2="33.7" y1="41.4" y2="41.4" gradientUnits="userSpaceOnUse"><stop stopColor="#9d21a4"/><stop offset=".5" stopColor="#f51c90"/><stop offset="1" stopColor="#9801ca"/></linearGradient><linearGradient id="leonardo-b" x1="27.9" x2="38.2" y1="15" y2="32.7" gradientUnits="userSpaceOnUse"><stop stopColor="#ff7300"/><stop offset=".7" stopColor="#ffb933"/><stop offset="1" stopColor="#ffdb4c"/></linearGradient><linearGradient id="leonardo-d" x1="20.9" x2="27" y1="29.8" y2="23.7" gradientUnits="userSpaceOnUse"><stop stopColor="#f1d003"/><stop offset=".6" stopColor="#eb583f"/><stop offset=".9" stopColor="#e4d494"/></linearGradient><linearGradient id="leonardo-e" x1="30.7" x2="26.5" y1="25" y2="20.8" gradientUnits="userSpaceOnUse"><stop stopColor="#fbb03b"/><stop offset=".2" stopColor="#f3bc58"/><stop offset=".4" stopColor="#e8cd82"/><stop offset=".6" stopColor="#e4d492"/><stop offset="1" stopColor="#e4d494"/></linearGradient><linearGradient id="leonardo-f" x1="28" x2="28" y1="21.3" y2="18.9" gradientUnits="userSpaceOnUse"><stop stopColor="#c7b299"/><stop offset=".7" stopColor="#f89b23"/></linearGradient><linearGradient id="leonardo-h" x1="25" x2="35.2" y1="41.1" y2="41.1" gradientUnits="userSpaceOnUse"><stop stopColor="#9800ce"/><stop offset=".5" stopColor="#ff288b"/><stop offset="1" stopColor="#f84690"/></linearGradient><linearGradient id="leonardo-i" x1="25" x2="30.1" y1="44.3" y2="44.3" gradientUnits="userSpaceOnUse"><stop stopColor="#f84690"/><stop offset=".5" stopColor="#ff288b"/><stop offset="1" stopColor="#9800ce"/></linearGradient><linearGradient id="leonardo-j" x1="24" x2="24" y1="11.6" y2="20" gradientUnits="userSpaceOnUse"><stop stopColor="#ff7300"/><stop offset="1" stopColor="#f7aa46"/><stop offset="1" stopColor="#f7ad49"/></linearGradient><linearGradient id="leonardo-k" x1="21.4" x2="27" y1="32.1" y2="32.1" gradientUnits="userSpaceOnUse"><stop stopColor="#ff7300"/><stop offset=".7" stopColor="#ffb933"/><stop offset="1" stopColor="#ffdb4c"/></linearGradient><linearGradient id="leonardo-l" x1="21.4" x2="27" y1="36.5" y2="36.5" gradientUnits="userSpaceOnUse"><stop stopColor="#ff7300"/><stop offset=".7" stopColor="#ffb933"/><stop offset="1" stopColor="#ffdb4c"/></linearGradient><linearGradient id="leonardo-o" x1="17.9" x2="23" y1="44.3" y2="44.3" gradientUnits="userSpaceOnUse"><stop stopColor="#f84690"/><stop offset=".5" stopColor="#ff288b"/><stop offset="1" stopColor="#9800ce"/></linearGradient><linearGradient id="leonardo-p" x1="14.3" x2="22.9" y1="41.4" y2="41.4" gradientUnits="userSpaceOnUse"><stop stopColor="#9d21a4"/><stop offset=".5" stopColor="#f51c90"/><stop offset="1" stopColor="#9801ca"/></linearGradient><linearGradient id="leonardo-q" x1="16.9" x2="23.2" y1="18.7" y2="22.2" gradientUnits="userSpaceOnUse"><stop stopColor="#f1d003"/><stop offset=".6" stopColor="#eb583f"/><stop offset=".9" stopColor="#848d73"/></linearGradient><linearGradient id="leonardo-r" x1="27" x2="20.9" y1="9.2" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#f1d003"/><stop offset=".6" stopColor="#e65b42"/><stop offset="1" stopColor="#818e93"/></linearGradient><linearGradient id="leonardo-s" x1="12.8" x2="23" y1="41.1" y2="41.1" gradientUnits="userSpaceOnUse"><stop stopColor="#f84690"/><stop offset=".5" stopColor="#ff288b"/><stop offset="1" stopColor="#9800ce"/></linearGradient><linearGradient id="leonardo-t" x1="19.3" x2="23" y1="33" y2="33" gradientUnits="userSpaceOnUse"><stop stopColor="#ff8f01"/><stop offset=".6" stopColor="#ff9800"/><stop offset="1" stopColor="#ffaf00"/></linearGradient><linearGradient id="leonardo-u" x1="18.6" x2="29.4" y1="29.1" y2="29.1" gradientUnits="userSpaceOnUse"><stop stopColor="#ff7300"/><stop offset=".7" stopColor="#ffb933"/><stop offset="1" stopColor="#ffdb4c"/></linearGradient><linearGradient id="leonardo-v" x1="17.6" x2="26.4" y1="35.1" y2="35.1" gradientUnits="userSpaceOnUse"><stop stopColor="#ff8f01"/><stop offset=".6" stopColor="#ff9800"/><stop offset="1" stopColor="#ffaf00"/></linearGradient><linearGradient id="leonardo-w" x1="8.7" x2="13.5" y1="33.2" y2="24.8" gradientUnits="userSpaceOnUse"><stop stopColor="#009bb6"/><stop offset=".6" stopColor="#2d6db2"/><stop offset=".9" stopColor="#585ca4"/></linearGradient><radialGradient id="leonardo-c" cx="0" cy="0" r="1" gradientTransform="matrix(6.42811 0 0 6.42363 26 19.5)" gradientUnits="userSpaceOnUse"><stop stopColor="#202646"/><stop offset=".3" stopColor="#0025c6"/><stop offset=".8" stopColor="#182948"/></radialGradient><radialGradient id="leonardo-g" cx="0" cy="0" r="1" gradientTransform="matrix(6.42811 0 0 6.42363 26 19.5)" gradientUnits="userSpaceOnUse"><stop stopColor="#202646"/><stop offset=".3" stopColor="#0025c6"/><stop offset=".8" stopColor="#182948"/></radialGradient><radialGradient id="leonardo-m" cx="0" cy="0" r="1" gradientTransform="matrix(5.01846 0 0 5.01497 22.2 20)" gradientUnits="userSpaceOnUse"><stop stopColor="#202646"/><stop offset=".3" stopColor="#0025c6"/><stop offset=".8" stopColor="#182948"/></radialGradient><radialGradient id="leonardo-n" cx="0" cy="0" r="1" gradientTransform="matrix(5.01846 0 0 5.01497 22.2 20)" gradientUnits="userSpaceOnUse"><stop stopColor="#202646"/><stop offset=".3" stopColor="#0025c6"/><stop offset=".8" stopColor="#182948"/></radialGradient></defs>
      </>
    ),
  },
  Pruna: {
    viewBox: "0 0 48 48",
    content: (
      <>
        <g clipPath="url(#pruna-a)"><mask id="pruna-b" width="48" height="48" x="0" y="0" maskUnits="userSpaceOnUse" style={{ maskType: "luminance" }}><path fill="#fff" d="M48 0H0v48h48z"/></mask><g clipPath="url(#pruna-c)" mask="url(#pruna-b)"><path fill="#fff" d="M9.2.7c3-.5 6.3-.3 9.1 1q2.4 1 4.1 2.9v-.3A2 2 0 0 1 23 3a4 4 0 0 1 3.5-1.2q.9 0 1.6 1 .3.6.2 1v.5q-.2 2.6-.8 5A18.5 18.5 0 0 1 43 26l.8.8q.7 1.3.2 2.4t-1 1.4q-1.1 6.8-6 11.4l-.7.6q-4.6 4-10.7 4.4a19 19 0 0 1-20-16.3h-.1a2.8 2.8 0 0 1 0-4.8q.7-7 5.7-11.9l-1.3-1-.5-.4a2 2 0 0 1-.6-1.4l.1-.7a39 39 0 0 1-1.4-8.3q0-.5.2-.8.4-.4.6-.5z"/><path fill="url(#pruna-d)" d="M7 28c0-9.1 7.7-16.5 17.2-16.5S41.4 18.9 41.4 28s-7.7 16.5-17.2 16.5S7 37 7 28"/><path fill="url(#pruna-e)" d="M19.7 43c7.8 0 14.2-7.8 14.2-17.4A19 19 0 0 0 28.6 12 16.6 16.6 0 0 1 41.4 28c0 9.1-7.7 16.5-17.2 16.5q-4.7 0-8.9-2.4 2.1.9 4.4.9"/><path fill="url(#pruna-f)" d="M10.6 3.5a80 80 0 0 1 6 5.8l-1.2.2c-.3 0-.8.2-.2.6-.7.4 1.5.8 1.6.9l1.6.2 1.2 1.6q-2.6.9-5.2-.2-2.5-1.3-3-4a30 30 0 0 1-.8-5"/><path fill="url(#pruna-g)" d="M11 3.4q3.8-.3 7 1.4.8 1 1.1 2.4.5 1.7-.1 3l-1-.8v-.1a4 4 0 0 0 0-1.8q0-.6-.4-.3l-.4 1.3z"/><path fill="#69a45c" d="M18 4.8q2.9 1.5 3.6 4.6a3 3 0 0 1-.8 2.7L19 10.3q.6-1.5.1-3t-1-2.5M15.2 10a4 4 0 0 0 2.2 0l1 1-1.6-.1c-.2 0-2.3-.5-1.6-1"/><path fill="#fff" d="M12.8 27.1a4.8 4.8 0 1 1 9.7 0 4.8 4.8 0 0 1-9.7 0m12.5 0a4.8 4.8 0 1 1 9.7 0 4.8 4.8 0 0 1-9.7 0"/><path fill="#ff94fb" d="M26.7 34.2c0 1.4-1.2 2.7-2.7 2.7s-2.7-1.3-2.7-2.8h.6l.6.1q.8.2 2 .3z"/><path fill="#36124c" fillRule="evenodd" d="m21.6 33.5.4.1.6.1q.9.3 1.9.3l2-.2h.2l.5-.1v.5q0 1.3-1 2.2-.8 1-2.2 1a3.3 3.3 0 0 1-3.2-3.3v-.4l.4-.1zm.3 1.1q.4 1.6 2.1 1.8.9 0 1.5-.7.4-.3.6-.9l-1.6.2-1.2-.1-1-.2z" clipRule="evenodd"/><path fill="#36124c" d="M18.4 24.1c1.5 0 2.8 1.4 2.8 3s-1.3 3-2.8 3-2.7-1.3-2.7-3v-.7a1 1 0 1 0 2-.8 1 1 0 0 0-1.2-.6q.8-.8 2-.9"/><path fill="#36124c" fillRule="evenodd" d="M17.8 21.8a5.4 5.4 0 1 1 0 10.7 5.4 5.4 0 0 1 0-10.8m0 1a4.4 4.4 0 1 0 0 8.7 4.4 4.4 0 0 0 0-8.7" clipRule="evenodd"/><path fill="#36124c" d="M31 24.1c1.4 0 2.7 1.4 2.7 3s-1.3 3-2.8 3-2.7-1.3-2.7-3v-.7a1 1 0 1 0 2-.8A1 1 0 0 0 29 25q.8-.8 2-.9"/><path fill="#36124c" fillRule="evenodd" d="M30.3 21.8a5.4 5.4 0 1 1 0 10.7 5.4 5.4 0 0 1 0-10.8m0 1a4.4 4.4 0 1 0 0 8.7 4.4 4.4 0 0 0 0-8.7" clipRule="evenodd"/><path fill="#36124c" fillRule="evenodd" d="M9.4 2c5.6-.9 12.2.8 13.9 7a21 21 0 0 0 .5-5l.1-.1q1-1 2.4-.9.9.2.7 1.1a32 32 0 0 1-1.1 6.3c8.9.8 15.3 7.6 15.9 16.4q.5.3.9.7c.5.8.1 2-.9 2.2v.1a18 18 0 0 1-6.3 11.8A17.6 17.6 0 0 1 6.7 29.8l-.6-.1c-1.2-.8-.8-2.5.5-2.8h.1a18 18 0 0 1 6.6-13l-1.2-.7-1.8-1.5q-.5-.5 0-.7v-.1a36 36 0 0 1-1.5-8.7zm16 10-1.2 2.4q-.5 1.2-1.5 1.5-1.2.2-2.3-.5c-.3-.5.2-.8.6-1v-.1q0-.3-.4-.4-2.5 1.3-5.2.7h-.2q-6 4.5-6.7 12l-.2.8q-.5.8-1.4.9 1.4.2 1.6 1.6a16 16 0 0 0 11.7 13.6A16 16 0 0 0 40 29.7q.2-1.2 1.3-1.3.1 0 0-.1-1.2-.3-1.2-1.4l-.3-1.8a16 16 0 0 0-14.5-13.2m-3.4.7-.4.3.1.3zM10.5 3.6q.2 2.4.9 5 .5 2.7 3 4a7 7 0 0 0 5.2.2l-1.2-1.6-1-1q-1.1.2-2.2-.1c-.6-.4 0-.5.2-.6l1.2-.2a80 80 0 0 0-6-5.7m.5-.2 6.1 5.1.4-1.3q.4-.3.5.3a4 4 0 0 1 0 1.8v.1l1 .9 1.8 1.8a3 3 0 0 0 .8-2.7q-.7-3-3.6-4.6c-2-1.2-4.6-1.5-7-1.4" clipRule="evenodd"/></g></g><defs><radialGradient id="pruna-d" cx="0" cy="0" r="1" gradientTransform="matrix(18.0153 0 0 17.2695 14.3 29.4)" gradientUnits="userSpaceOnUse"><stop stopColor="#ac51ff"/><stop offset="1" stopColor="#9b36f6"/></radialGradient><radialGradient id="pruna-e" cx="0" cy="0" r="1" gradientTransform="matrix(18.0153 0 0 17.2695 14.3 29.4)" gradientUnits="userSpaceOnUse"><stop stopColor="#ac51ff"/><stop offset="1" stopColor="#9b36f6"/></radialGradient><radialGradient id="pruna-f" cx="0" cy="0" r="1" gradientTransform="matrix(18.0153 0 0 17.2695 14.3 29.4)" gradientUnits="userSpaceOnUse"><stop stopColor="#ac51ff"/><stop offset="1" stopColor="#9b36f6"/></radialGradient><radialGradient id="pruna-g" cx="0" cy="0" r="1" gradientTransform="matrix(18.0153 0 0 17.2695 14.3 29.4)" gradientUnits="userSpaceOnUse"><stop stopColor="#ac51ff"/><stop offset="1" stopColor="#9b36f6"/></radialGradient><clipPath id="pruna-a"><path fill="#fff" d="M0 0h48v48H0z"/></clipPath><clipPath id="pruna-c"><path fill="#fff" d="M0-.2h48v48H0z"/></clipPath></defs>
      </>
    ),
  },
  Vidu: {
    viewBox: "0 0 48 48",
    content: (
      <>
        <g clipPath='url(#vidu-a)'><mask id="vidu-b" width='48' height='48' x='0' y='0' maskUnits='userSpaceOnUse' style={{ maskType: "luminance" }}><path fill='#fff' d='M48 0H0v48h48z'/></mask><g mask='url(#vidu-b)'><path fill='url(#vidu-c)' d='M39.8 6.5c-5.4-1.8-10 2-11 5.4l-5.5 17.6c-.8 2.5-2.8 6.5-6.4 6.5-3 0-4.6-2.8-5.2-4.5L7.3 19.7c-.6-1.3 0-3.8 2-4.5 2.3-.8 3.7 1 4 2L19 31.4c1.3-1.7 2.1-4.5 2.7-6.4l-3.7-9.6a8 8 0 0 0-10.5-4.9 8.7 8.7 0 0 0-4.9 11l4.6 11.8c.7 1.8 3.4 7.7 9.7 7.7 7.4 0 10.2-6.4 11.8-11.4l5-16.2c.6-2 3.2-2.6 4.7-2 1.1.3 3.1 1.8 2.5 4.2-.1.4-3.5 11.4-4.8 14.7-.6 1.7-2.3 5.5-6 5a15 15 0 0 1-3.6 5.3C31 43 38 40.6 40.9 32l4.8-15a8.7 8.7 0 0 0-6-10.4'/></g></g><defs><linearGradient id="vidu-c" x1='3.4' x2='50' y1='12.7' y2='34.1' gradientUnits='userSpaceOnUse'><stop stopColor='#40edd8'/><stop offset='0' stopColor='#38e7e2'/><stop offset='.1' stopColor='#28daf7'/><stop offset='.1' stopColor='#22d5ff'/><stop offset='.4' stopColor='#1abfff'/><stop offset='.8' stopColor='#0786fe'/><stop offset='.9' stopColor='#047ffe'/></linearGradient><clipPath id="vidu-a"><path fill='#fff' d='M0 0h48v48H0z'/></clipPath></defs>
      </>
    ),
  },
};

const MONOGRAM_STYLES: Record<string, { initials: string; className: string }> = {};

const FALLBACK_CLASSES = [
  "bg-[#7C3AED]/15 text-[#a78bfa]",
  "bg-[#3B82F6]/15 text-[#60a5fa]",
  "bg-[#F59E0B]/15 text-[#fbbf24]",
  "bg-[#EF4444]/15 text-[#f87171]",
];

function fallbackFor(provider: string) {
  let hash = 0;
  for (let i = 0; i < provider.length; i++) hash = (hash * 31 + provider.charCodeAt(i)) >>> 0;
  const initials = provider
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return { initials: initials || "?", className: FALLBACK_CLASSES[hash % FALLBACK_CLASSES.length] };
}

const sizeClasses = { sm: "size-5", md: "size-7" } as const;
const iconInsetClasses = { sm: "size-3.5", md: "size-5" } as const;
const textSizeClasses = { sm: "text-[9px]", md: "text-[10px]" } as const;

export function ProviderLogo({
  provider,
  size = "md",
  className,
}: {
  provider: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const real = REAL_LOGOS[provider];
  if (real) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-white/95",
          sizeClasses[size],
          className,
        )}
        aria-hidden="true"
      >
        <svg viewBox={real.viewBox} className={cn(iconInsetClasses[size], "text-black")}>
          {real.content}
        </svg>
      </span>
    );
  }

  const style = MONOGRAM_STYLES[provider] ?? fallbackFor(provider);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        sizeClasses[size],
        textSizeClasses[size],
        style.className,
        className,
      )}
      aria-hidden="true"
    >
      {style.initials}
    </span>
  );
}
