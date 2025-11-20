module.exports = {

  content: [
    './app/views/**/*.html.erb',
    './app/helpers/**/*.rb',
    './app/javascript/**/*.js',
  ],
  
  theme: {
    extend: {
  
      colors: {
        // primary: '#your-color-here',
        // secondary: '#your-color-here',
      },
      fontFamily: {
        // sans: ['Your-Font-Name', 'system-ui', 'sans-serif'],
      },
    },
  },

  
  // daisyUI configuration 
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "dark",
    base: true, // applies background color and foreground color for root element
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
  },
}
