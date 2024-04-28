/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')

module.exports = {
    content: [
        "./templates/**/*.{html,js}",
        "./static/**/*.js",
    ],
        darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: 'rgb(var(--primary) / <alpha-value>)',
                secondary: 'rgb(var(--secondary) / <alpha-value>)',
                ternary: 'rgb(var(--ternary) / <alpha-value>)',
                neutral: {
                    100: 'rgb(var(--neutral-100) / <alpha-value>)',
                    500: 'rgb(var(--neutral-500) / <alpha-value>)',
                    900: 'rgb(var(--neutral-900) / <alpha-value>)',
                },
                gray: {
                    100: 'rgb(var(--gray-100) / <alpha-value>)',
                    500: 'rgb(var(--gray-500) / <alpha-value>)',
                    900: 'rgb(var(--gray-900) / <alpha-value>)',
                },
                typo: {
                    100: 'rgb(var(--text-100) / <alpha-value>)',
                    500: 'rgb(var(--text-500) / <alpha-value>)',
                    900: 'rgb(var(--text-900) / <alpha-value>)',
                },
                success: 'rgb(var(--success) / <alpha-value>)',
                warning: 'rgb(var(--warning) / <alpha-value>)',
                danger: 'rgb(var(--danger) / <alpha-value>)',
            },
        },
        fontFamily: {
            sans: ['Roboto', 'sans-serif'],
        }
    },
    plugins: [
        /**
         * '@tailwindcss/forms' is the forms plugin that provides a minimal styling
         * for forms. If you don't like it or have own styling for forms,
         * comment the line below to disable '@tailwindcss/forms'.
         */
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
    ],
    safelist: [
        "w-12",
        "w-24",
        "w-36",
        "w-48",
        "h-12",
        "h-24",
        "h-36",
        "h-48",
        "text-white",
        "text-black",
    ],
}

