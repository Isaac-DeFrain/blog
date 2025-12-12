{
  description = "Blog reader development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24
            markdownlint-cli
          ];

          shellHook = ''
            echo "Blog reader development environment"
            echo "Node.js version: $(node --version)"
            echo "npm version: $(npm --version)"
            echo "markdownlint version: $(markdownlint --version)"
          '';
        };
      }
    );
}
