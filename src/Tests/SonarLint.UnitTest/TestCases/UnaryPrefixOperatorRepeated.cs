﻿using System;
using System.Collections.Generic;

namespace Tests.Diagnostics
{

    class UnaryPrefixOperatorRepeated
    {
        static void NonComp(  )
        {
            int i = 1;

            int k = ~~i; // Noncompliant; same as i
            int m = + +i;  // Compliant

            bool b = false;
            bool c = !!!b; // Noncompliant
        }

        static void Comp()
        {
            int i = 1;

            int j = -i;
            j = -(-i); //Compliant, not a typo
            int k = i;
            int m = i;

            bool b = false;
            bool c = !b;
        }
    }
}
