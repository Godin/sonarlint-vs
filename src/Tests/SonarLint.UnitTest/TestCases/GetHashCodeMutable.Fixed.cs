﻿using System;
using System.Collections.Generic;
using System.Runtime.Remoting.Metadata.W3cXsd2001;

namespace Tests.Diagnostics
{
    public class AnyOther
    {
        public readonly int Field;
    }

    public class GetHashCodeMutable : AnyOther
    {
        public readonly DateTime birthday;
        public const int Zero = 0;
        public readonly int age;
        public readonly string name;
        int foo, bar;

        public GetHashCodeMutable()
        {
        }

        public override int GetHashCode()
        {
            int hash = Zero;
            hash += foo.GetHashCode(); // Noncompliant, can't make readonly in this case
            hash += age.GetHashCode(); // Noncompliant
            hash += this.name.GetHashCode(); // Noncompliant
            hash += this.birthday.GetHashCode();
            hash += Field; // Noncompliant
            return hash;
        }
        public int SomeMethod()
        {
            int hash = Zero;
            hash += this.age.GetHashCode();
            return hash;
        }
    }
}
