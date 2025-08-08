# x86 Virtual Address Converter

This is a web-based tool for converting x86 virtual addresses. It helps to understand the memory management concepts in x86 architecture by showing how a virtual address is translated into its constituent parts (paging table indices and offset), and vice-versa.

## Features

*   **Virtual to Physical Address Translation:** Input a virtual address and see the breakdown into paging table indices and offset.
*   **Physical to Virtual Address Translation:** Input paging table indices and offset to see the resulting virtual address.
*   **Multiple Paging Modes:** Supports 32-bit PAE, 64-bit 4-level, and 64-bit 5-level paging.
*   **Interactive Visualization:** An SVG-based visualization shows the address translation flow.
*   **Error Handling:** Provides clear error messages for invalid or non-canonical addresses.
*   **Responsive Design:** The tool is designed to work on different screen sizes.

## How to Use

1.  **Open `index.html` in your web browser.**
2.  **Select the Paging Mode:** Choose between "32 bit (with PAE)", "64 bit (with level-4 page table)", or "64 bit (with level-5 page table)".
3.  **Enter a Virtual Address:** Type a hexadecimal virtual address in the "Virtual Address" input field. The paging table indices and offset will be calculated and displayed automatically.
4.  **Enter Paging Table Indices:** Alternatively, you can enter the values for the paging table indices and the page offset. The virtual address will be calculated and displayed automatically.
5.  **View the Visualization:** The diagram at the bottom of the page will update to show the translation flow for the current address.

## Technologies Used

*   HTML5
*   CSS3
*   JavaScript (ES6+)
*   Bootstrap 5

## Author

This project is maintained by rickyadastra. You can find more of their work on [GitHub](https://github.com/rickyadastra).
