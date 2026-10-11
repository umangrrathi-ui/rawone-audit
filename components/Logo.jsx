// RawOne mark — from website-kit/partials.html
export function Mark({ color = "#141414", className = "", style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 166 138" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill={color}
        d="M132.862 0C134.067 2.44752e-07 135.241 0.391123 136.206 1.11426C155.021 15.2206 153.783 43.8284 133.82 56.2568L4.62368 136.688C2.25721 138.162 -0.671647 135.916 0.137355 133.248L38.6071 6.42969C39.7656 2.61101 43.2864 3.5983e-05 47.277 0H132.862ZM164.277 128.719C166.799 130.364 165.623 134.283 162.612 134.269L86.652 133.902C73.4178 133.838 62.9693 122.643 63.818 109.436L101.158 87.5488L164.277 128.719Z"
      />
    </svg>
  );
}

export default function Logo({ href = "/" }) {
  return (
    <a className="logo" href={href} aria-label="RawOne home">
      <Mark />
      <b>RawOne</b>
    </a>
  );
}
