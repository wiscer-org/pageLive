# Page Adapter Features

This folder contains feature modules used by page adapters.

The objective of files inside `features` is to provide consistency among page adapters by encapsulating reusable behavior, utilities, or feature-specific logic in a shared structure.

Features in this folder should:

- represent distinct capabilities or behaviors used across adapters
- keep adapter implementations consistent and easier to maintain
- provide a common interface or pattern for shared functionality

By organizing shared functionality here, page adapters can remain focused on page-specific details while relying on consistent feature encapsulation.

Each functions separated in different modules / files to allow page adapters only import specific function, thus will minimize built file.
