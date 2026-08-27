# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION ${CMAKE_VERSION}) # this file comes with cmake

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-src")
  file(MAKE_DIRECTORY "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-src")
endif()
file(MAKE_DIRECTORY
  "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-build"
  "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-subbuild/jwt_cpp-populate-prefix"
  "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-subbuild/jwt_cpp-populate-prefix/tmp"
  "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-subbuild/jwt_cpp-populate-prefix/src/jwt_cpp-populate-stamp"
  "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-subbuild/jwt_cpp-populate-prefix/src"
  "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-subbuild/jwt_cpp-populate-prefix/src/jwt_cpp-populate-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-subbuild/jwt_cpp-populate-prefix/src/jwt_cpp-populate-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/home/shreyber/timp/4thLab/Back/build/_deps/jwt_cpp-subbuild/jwt_cpp-populate-prefix/src/jwt_cpp-populate-stamp${cfgdir}") # cfgdir has leading slash
endif()
