/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./templates/**/*.{html,js}"],
    theme: {
        extend: {},
    },
    plugins: [],
    safelist: [
        "w-12",
        "w-24",
        "w-36",
        "w-48",
        "h-12",
        "h-24",
        "h-36",
        "h-48",
    ],
}

