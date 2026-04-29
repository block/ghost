// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Fixture",
    products: [.library(name: "Fixture", targets: ["Fixture"])],
    targets: [.target(name: "Fixture", path: "Sources")]
)
