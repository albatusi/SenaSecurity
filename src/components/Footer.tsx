export default function Footer() {
  return (
    <footer className="bg-gray-200 dark:bg-gray-800 py-4 shadow-inner mt-auto">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
          © 2025 <span className="font-bold">Sena Security Mobile</span>. Todos los derechos reservados.
        </p>

        <div className="flex gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Política</a>
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Términos</a>
        </div>
      </div>
    </footer>
  );
}
